import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, emailVerificationCode } from '$lib/server/db/schema';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { sendMail, generateVerificationCode, buildVerificationEmail } from '$lib/server/services/email.service';
import { lucia, isMobileUserAgent } from '$lib/server/auth/lucia';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userId = url.searchParams.get('userId');
	const email = url.searchParams.get('email');

	if (locals.user && locals.user.isEmailVerified) {
		throw redirect(302, '/siswa');
	}

	if (!userId && !locals.user) {
		throw redirect(302, '/login');
	}

	const targetUserId = userId ? parseInt(userId) : Number(locals.user?.id ?? 0);

	const users = await db.select().from(userTable).where(eq(userTable.id, targetUserId)).limit(1);
	const targetUser = users[0];

	if (!targetUser) {
		throw redirect(302, '/login');
	}

	if (targetUser.isEmailVerified) {
		throw redirect(302, '/siswa');
	}

	return {
		userId: targetUser.id,
		email: targetUser.email || email || '',
		fullName: targetUser.fullName
	};
};

export const actions: Actions = {
	verify: async ({ request, cookies }) => {
		const formData = await request.formData();
		const userId = parseInt(formData.get('userId') as string);
		const code = (formData.get('code') as string)?.trim();

		if (!userId || !code || code.length !== 6) {
			return fail(400, { error: 'Kode verifikasi 6 digit wajib diisi lengkap.' });
		}

		// Cari kode verifikasi terbaru di DB
		const codes = await db
			.select()
			.from(emailVerificationCode)
			.where(and(eq(emailVerificationCode.userId, userId), gt(emailVerificationCode.expiresAt, new Date())))
			.orderBy(desc(emailVerificationCode.createdAt))
			.limit(1);

		const activeCodeRecord = codes[0];

		if (!activeCodeRecord) {
			return fail(400, { error: 'Kode verifikasi tidak ditemukan atau telah kadaluarsa. Silakan minta kode baru.' });
		}

		// Cek max 5x percobaan
		if (activeCodeRecord.attempts >= 5) {
			await db.delete(emailVerificationCode).where(eq(emailVerificationCode.id, activeCodeRecord.id));
			return fail(400, { error: 'Kode verifikasi telah hangus karena salah mencoba 5 kali. Silakan minta kode baru.' });
		}

		// Jika kode salah
		if (activeCodeRecord.code !== code) {
			const newAttempts = activeCodeRecord.attempts + 1;
			if (newAttempts >= 5) {
				await db.delete(emailVerificationCode).where(eq(emailVerificationCode.id, activeCodeRecord.id));
				return fail(400, { error: 'Kode verifikasi telah hangus karena salah mencoba 5 kali. Silakan minta kode baru.' });
			}

			await db
				.update(emailVerificationCode)
				.set({ attempts: sql`${emailVerificationCode.attempts} + 1` })
				.where(eq(emailVerificationCode.id, activeCodeRecord.id));

			const sisa = 5 - newAttempts;
			return fail(400, { error: `Kode verifikasi 6 digit salah. Sisa percobaan: ${sisa}x lagi.` });
		}

		// Update status email verified
		await db
			.update(userTable)
			.set({
				isEmailVerified: true,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, userId));

		// Hapus kode verifikasi bekas
		await db.delete(emailVerificationCode).where(eq(emailVerificationCode.userId, userId));

		// Login otomatis (buat Lucia session)
		const userAgent = request.headers.get('user-agent');
		const isMobile = isMobileUserAgent(userAgent);

		const session = await lucia.createSession(String(userId), {
			uaIsMobile: isMobile,
			rememberMe: true
		});

		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		throw redirect(303, '/siswa?verified=success');
	},

	resend: async ({ request }) => {
		const formData = await request.formData();
		const userId = parseInt(formData.get('userId') as string);

		if (!userId) {
			return fail(400, { resendError: 'ID Pengguna tidak ditemukan.' });
		}

		const users = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
		const targetUser = users[0];

		if (!targetUser || !targetUser.email) {
			return fail(400, { resendError: 'Email pengguna tidak ditemukan.' });
		}

		// Rate Limiting: Cooldown 60 detik sebelum resend
		const existingCodes = await db
			.select()
			.from(emailVerificationCode)
			.where(eq(emailVerificationCode.userId, userId))
			.orderBy(desc(emailVerificationCode.createdAt))
			.limit(1);

		if (existingCodes.length > 0) {
			const lastCreatedAt = new Date(existingCodes[0].createdAt).getTime();
			const elapsedSeconds = Math.floor((Date.now() - lastCreatedAt) / 1000);
			if (elapsedSeconds < 60) {
				const remaining = 60 - elapsedSeconds;
				return fail(400, { error: `Harap tunggu ${remaining} detik lagi sebelum meminta kode verifikasi baru.` });
			}
		}

		// Hapus kode lama
		await db.delete(emailVerificationCode).where(eq(emailVerificationCode.userId, userId));

		// Buat kode OTP baru
		const newCode = generateVerificationCode();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

		await db.insert(emailVerificationCode).values({
			userId,
			email: targetUser.email,
			code: newCode,
			attempts: 0,
			expiresAt
		});

		await sendMail({
			to: targetUser.email,
			subject: '✉️ Kode Verifikasi Email Baru — NLC',
			html: buildVerificationEmail({
				fullName: targetUser.fullName,
				code: newCode,
				expiresInMinutes: 15
			}),
			text: `Kode verifikasi baru Anda adalah: ${newCode}`
		});

		return {
			resendSuccess: true,
			message: `Kode verifikasi baru telah dikirim ke ${targetUser.email}`
		};
	},

	updateEmail: async ({ request }) => {
		const formData = await request.formData();
		const userId = parseInt(formData.get('userId') as string);
		const newEmail = (formData.get('newEmail') as string)?.trim().toLowerCase();

		if (!userId || !newEmail) {
			return fail(400, { emailError: 'Alamat email baru wajib diisi.' });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
			return fail(400, { emailError: 'Format alamat email tidak valid.' });
		}

		const users = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
		const targetUser = users[0];
		if (!targetUser) {
			return fail(400, { emailError: 'Pengguna tidak ditemukan. Silakan mendaftar kembali.' });
		}

		if (targetUser.email === newEmail) {
			return fail(400, { emailError: 'Alamat email baru sama dengan alamat email saat ini.' });
		}

		const existingWithEmail = await db
			.select()
			.from(userTable)
			.where(eq(userTable.email, newEmail))
			.limit(1);

		if (existingWithEmail.length > 0) {
			return fail(400, { emailError: 'Alamat email tersebut sudah terdaftar pada akun lain.' });
		}

		// Update email pengguna di database
		await db
			.update(userTable)
			.set({
				email: newEmail,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, userId));

		// Hapus kode OTP lama
		await db.delete(emailVerificationCode).where(eq(emailVerificationCode.userId, userId));

		// Buat kode OTP baru
		const newCode = generateVerificationCode();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

		await db.insert(emailVerificationCode).values({
			userId,
			email: newEmail,
			code: newCode,
			attempts: 0,
			expiresAt
		});

		// Kirim email verifikasi ke email yang baru diperbarui
		await sendMail({
			to: newEmail,
			subject: '✉️ Kode Verifikasi Email Pendaftaran Baru — NLC',
			html: buildVerificationEmail({
				fullName: targetUser.fullName,
				code: newCode,
				expiresInMinutes: 15
			}),
			text: `Halo ${targetUser.fullName},\n\nAlamat email pendaftaran Anda telah diperbarui. Kode verifikasi akun NLC Anda adalah: ${newCode}\nKode ini berlaku selama 15 menit.`
		});

		return {
			emailSuccess: true,
			updatedEmail: newEmail,
			message: `Alamat email berhasil diperbarui ke ${newEmail}! Kode OTP baru telah dikirimkan.`
		};
	}
};
