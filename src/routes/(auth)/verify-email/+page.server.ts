import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, emailVerificationCode } from '$lib/server/db/schema';
import { eq, and, gt, lte, desc, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import {
	sendMail,
	generateVerificationCode,
	hashVerificationCode,
	getCooldownForResend,
	buildVerificationEmail
} from '$lib/server/services/email.service';
import { lucia, isMobileUserAgent } from '$lib/server/auth/lucia';
import { authRateLimiter } from '$lib/server/utils/rate-limiter';

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

	// Clean up expired OTPs for this user
	await db
		.delete(emailVerificationCode)
		.where(and(eq(emailVerificationCode.userId, targetUserId), lte(emailVerificationCode.expiresAt, new Date())));

	// Calculate remaining cooldown for active/recent OTP
	const activeCodes = await db
		.select()
		.from(emailVerificationCode)
		.where(eq(emailVerificationCode.userId, targetUserId))
		.orderBy(desc(emailVerificationCode.createdAt))
		.limit(1);

	let remainingCooldown = 0;
	if (activeCodes.length > 0) {
		const codeRecord = activeCodes[0];
		const elapsedSeconds = Math.floor((Date.now() - new Date(codeRecord.createdAt).getTime()) / 1000);
		const requiredCooldown = getCooldownForResend(codeRecord.resendCount ?? 0);
		remainingCooldown = Math.max(0, requiredCooldown - elapsedSeconds);
	}

	return {
		userId: targetUser.id,
		email: targetUser.email || email || '',
		fullName: targetUser.fullName,
		remainingCooldown
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

		// Hash code untuk mencocokkan dengan hash di DB
		const hashCode = hashVerificationCode(code);

		// Clean up expired codes for user
		await db
			.delete(emailVerificationCode)
			.where(and(eq(emailVerificationCode.userId, userId), lte(emailVerificationCode.expiresAt, new Date())));

		// Cari kode verifikasi aktif di DB
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

		// Bandingkan hash OTP
		if (activeCodeRecord.code !== hashCode) {
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

	resend: async ({ request, getClientAddress }) => {
		const ipAddress = getClientAddress() || request.headers.get('x-forwarded-for') || '127.0.0.1';
		const rateLimit = authRateLimiter.check(`resend_otp_${ipAddress}`, 5, 60000);
		if (!rateLimit.allowed) {
			return fail(429, {
				error: `Terlalu banyak permintaan OTP dari perangkat ini. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.`
			});
		}

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

		// Query riwayat OTP terakhir untuk menghitung progressive cooldown
		const existingCodes = await db
			.select()
			.from(emailVerificationCode)
			.where(eq(emailVerificationCode.userId, userId))
			.orderBy(desc(emailVerificationCode.createdAt))
			.limit(1);

		let currentResendCount = 0;
		if (existingCodes.length > 0) {
			const lastCode = existingCodes[0];
			currentResendCount = lastCode.resendCount ?? 0;
			const lastCreatedAt = new Date(lastCode.createdAt).getTime();
			const elapsedSeconds = Math.floor((Date.now() - lastCreatedAt) / 1000);
			const requiredCooldown = getCooldownForResend(currentResendCount);

			if (elapsedSeconds < requiredCooldown) {
				const remaining = requiredCooldown - elapsedSeconds;
				return fail(400, {
					error: `Harap tunggu ${remaining} detik lagi sebelum meminta kode verifikasi baru.`,
					remainingCooldown: remaining
				});
			}
		}

		const nextResendCount = currentResendCount + 1;
		if (nextResendCount > 5) {
			return fail(429, {
				error: 'Anda telah mencapai batas maksimum permintaan ulang OTP (5x). Silakan coba lagi nanti atau hubungi administrator.'
			});
		}

		// Hapus kode lama
		await db.delete(emailVerificationCode).where(eq(emailVerificationCode.userId, userId));

		// Buat kode OTP baru
		const newCode = generateVerificationCode();
		const hashedNewCode = hashVerificationCode(newCode);
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

		await db.insert(emailVerificationCode).values({
			userId,
			email: targetUser.email,
			code: hashedNewCode,
			attempts: 0,
			resendCount: nextResendCount,
			expiresAt
		});

		const mailResult = await sendMail({
			to: targetUser.email,
			subject: '✉️ Kode Verifikasi Email Baru — NLC',
			html: buildVerificationEmail({
				fullName: targetUser.fullName,
				code: newCode,
				expiresInMinutes: 5
			}),
			text: `Kode verifikasi baru Anda adalah: ${newCode}`
		});

		if (!mailResult.success) {
			return fail(500, {
				error: `Gagal mengirim email OTP: ${mailResult.error}. Silakan periksa jaringan/layanan email Anda.`
			});
		}

		const nextCooldown = getCooldownForResend(nextResendCount);

		return {
			resendSuccess: true,
			remainingCooldown: nextCooldown,
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
		const hashedNewCode = hashVerificationCode(newCode);
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

		await db.insert(emailVerificationCode).values({
			userId,
			email: newEmail,
			code: hashedNewCode,
			attempts: 0,
			resendCount: 0,
			expiresAt
		});

		// Kirim email verifikasi ke email baru
		const mailResult = await sendMail({
			to: newEmail,
			subject: '✉️ Kode Verifikasi Email Pendaftaran Baru — NLC',
			html: buildVerificationEmail({
				fullName: targetUser.fullName,
				code: newCode,
				expiresInMinutes: 5
			}),
			text: `Halo ${targetUser.fullName},\n\nAlamat email pendaftaran Anda telah diperbarui. Kode verifikasi akun NLC Anda adalah: ${newCode}\nKode ini berlaku selama 5 menit.`
		});

		if (!mailResult.success) {
			return fail(500, {
				emailError: `Email berhasil diubah ke ${newEmail}, namun gagal mengirimkan OTP: ${mailResult.error}`
			});
		}

		return {
			emailSuccess: true,
			updatedEmail: newEmail,
			remainingCooldown: 30,
			message: `Alamat email berhasil diperbarui ke ${newEmail}! Kode OTP baru telah dikirimkan.`
		};
	}
};
