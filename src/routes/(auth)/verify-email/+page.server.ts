import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, pendingRegistration } from '$lib/server/db/schema';
import { eq, and, gt, lte, or, desc, sql } from 'drizzle-orm';
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

export const load: PageServerLoad = async ({ url, locals, cookies, request }) => {
	const token = url.searchParams.get('token');
	const isAuto = url.searchParams.has('auto') || url.searchParams.get('autoverify') === 'true';

	if (locals.user && locals.user.isEmailVerified) {
		throw redirect(302, '/siswa');
	}

	if (!token) {
		throw redirect(302, '/register');
	}

	// Bersihkan draf pendaftaran yang sudah expired
	await db.delete(pendingRegistration).where(sql.raw('expires_at <= NOW()'));

	// Cari sesi pendaftaran sementara berdasarkan token acak
	const pendingList = await db
		.select()
		.from(pendingRegistration)
		.where(and(eq(pendingRegistration.token, token), gt(pendingRegistration.expiresAt, new Date())))
		.limit(1);

	const pending = pendingList[0];

	if (!pending) {
		return {
			token: '',
			email: '',
			fullName: '',
			remainingCooldown: 0,
			isExpiredOrInvalid: true
		};
	}

	// JIKA VERIFIKASI OTOMATIS (Klik tombol "Lanjutkan Verifikasi Otomatis" dari email)
	if (isAuto) {
		const existingUserCheck = await db
			.select()
			.from(userTable)
			.where(or(eq(userTable.username, pending.username), eq(userTable.email, pending.email)))
			.limit(1);

		let newUser = existingUserCheck[0];

		if (!newUser) {
			// DEFERRED CREATION: Insert akun resmi ke tabel `user`
			const newUsers = await db
				.insert(userTable)
				.values({
					username: pending.username,
					email: pending.email,
					fullName: pending.fullName,
					passwordHash: pending.passwordHash,
					role: 'siswa',
					isEmailVerified: true,
					isActive: true
				})
				.returning();

			newUser = newUsers[0];
		}

		// Hapus data pendaftaran sementara
		await db
			.delete(pendingRegistration)
			.where(or(eq(pendingRegistration.token, token), eq(pendingRegistration.email, pending.email)));

		// Buat Lucia session untuk login otomatis
		const userAgent = request.headers.get('user-agent');
		const isMobile = isMobileUserAgent(userAgent);

		const session = await lucia.createSession(String(newUser.id), {
			uaIsMobile: isMobile,
			rememberMe: true
		});

		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		throw redirect(302, '/siswa?verified=success');
	}

	const elapsedSeconds = Math.floor((Date.now() - new Date(pending.createdAt).getTime()) / 1000);
	const requiredCooldown = getCooldownForResend(pending.resendCount ?? 0);
	const remainingCooldown = Math.max(0, requiredCooldown - elapsedSeconds);

	return {
		token: pending.token,
		email: pending.email,
		fullName: pending.fullName,
		remainingCooldown,
		isExpiredOrInvalid: false
	};
};

export const actions: Actions = {
	verify: async ({ request, cookies }) => {
		const formData = await request.formData();
		const token = (formData.get('token') as string)?.trim();
		const code = (formData.get('code') as string)?.trim();

		if (!token || !code || code.length !== 6) {
			return fail(400, { error: 'Kode verifikasi 6 digit wajib diisi lengkap.' });
		}

		// Hash input code untuk dicocokkan
		const hashCode = hashVerificationCode(code);

		// Bersihkan expired
		await db.delete(pendingRegistration).where(sql.raw('expires_at <= NOW()'));

		// Cari pending registration
		const pendingList = await db
			.select()
			.from(pendingRegistration)
			.where(and(eq(pendingRegistration.token, token), gt(pendingRegistration.expiresAt, new Date())))
			.limit(1);

		const pending = pendingList[0];

		if (!pending) {
			return fail(400, { error: 'Sesi verifikasi tidak ditemukan atau telah kadaluarsa. Silakan mendaftar kembali.' });
		}

		// Cek max 5x salah tebak
		if (pending.attempts >= 5) {
			await db.delete(pendingRegistration).where(eq(pendingRegistration.id, pending.id));
			return fail(400, { error: 'Kode verifikasi telah hangus karena salah mencoba 5 kali. Silakan mendaftar kembali.' });
		}

		// Bandingkan hash OTP
		if (pending.code !== hashCode) {
			const newAttempts = pending.attempts + 1;
			if (newAttempts >= 5) {
				await db.delete(pendingRegistration).where(eq(pendingRegistration.id, pending.id));
				return fail(400, { error: 'Kode verifikasi telah hangus karena salah mencoba 5 kali. Silakan mendaftar kembali.' });
			}

			await db
				.update(pendingRegistration)
				.set({ attempts: sql`${pendingRegistration.attempts} + 1` })
				.where(eq(pendingRegistration.id, pending.id));

			const sisa = 5 - newAttempts;
			return fail(400, { error: `Kode verifikasi 6 digit salah. Sisa percobaan: ${sisa}x lagi.` });
		}

		// KODE BENAR! Cek ketersediaan username/email di tabel `user` resmi
		const existingUserCheck = await db
			.select()
			.from(userTable)
			.where(or(eq(userTable.username, pending.username), eq(userTable.email, pending.email)))
			.limit(1);

		if (existingUserCheck.length > 0) {
			await db.delete(pendingRegistration).where(eq(pendingRegistration.id, pending.id));
			return fail(400, { error: 'Username atau Email tersebut telah terdaftar pada akun lain. Silakan mendaftar kembali.' });
		}

		// DEFERRED CREATION: Baru insert akun resmi ke tabel `user` sekarang!
		const newUsers = await db
			.insert(userTable)
			.values({
				username: pending.username,
				email: pending.email,
				fullName: pending.fullName,
				passwordHash: pending.passwordHash,
				role: 'siswa',
				isEmailVerified: true,
				isActive: true
			})
			.returning();

		const newUser = newUsers[0];

		// Hapus data pendaftaran sementara
		await db
			.delete(pendingRegistration)
			.where(or(eq(pendingRegistration.token, token), eq(pendingRegistration.email, pending.email)));

		// Buat Lucia session untuk login otomatis
		const userAgent = request.headers.get('user-agent');
		const isMobile = isMobileUserAgent(userAgent);

		const session = await lucia.createSession(String(newUser.id), {
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

	resend: async ({ request, url, getClientAddress }) => {
		const ipAddress = getClientAddress() || request.headers.get('x-forwarded-for') || '127.0.0.1';
		const rateLimit = authRateLimiter.check(`resend_otp_${ipAddress}`, 5, 60000);
		if (!rateLimit.allowed) {
			return fail(429, {
				error: `Terlalu banyak permintaan OTP dari perangkat ini. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.`
			});
		}

		const formData = await request.formData();
		const token = (formData.get('token') as string)?.trim();

		if (!token) {
			return fail(400, { resendError: 'Token sesi verifikasi tidak ditemukan.' });
		}

		const pendingList = await db
			.select()
			.from(pendingRegistration)
			.where(eq(pendingRegistration.token, token))
			.limit(1);

		const pending = pendingList[0];

		if (!pending) {
			return fail(400, { resendError: 'Sesi verifikasi tidak ditemukan atau telah kadaluarsa. Silakan mendaftar kembali.' });
		}

		// Progressive Cooldown Check
		const currentResendCount = pending.resendCount ?? 0;
		const lastCreatedAt = new Date(pending.createdAt).getTime();
		const elapsedSeconds = Math.floor((Date.now() - lastCreatedAt) / 1000);
		const requiredCooldown = getCooldownForResend(currentResendCount);

		if (elapsedSeconds < requiredCooldown) {
			const remaining = requiredCooldown - elapsedSeconds;
			return fail(400, {
				error: `Harap tunggu ${remaining} detik lagi sebelum meminta kode verifikasi baru.`,
				remainingCooldown: remaining
			});
		}

		const nextResendCount = currentResendCount + 1;
		if (nextResendCount > 5) {
			return fail(429, {
				error: 'Anda telah mencapai batas maksimum permintaan ulang OTP (5x). Silakan mendaftar kembali.'
			});
		}

		// Buat kode OTP baru
		const newCode = generateVerificationCode();
		const hashedNewCode = hashVerificationCode(newCode);
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

		// Update record pending registration yang ada
		await db
			.update(pendingRegistration)
			.set({
				code: hashedNewCode,
				attempts: 0,
				resendCount: nextResendCount,
				expiresAt,
				createdAt: new Date()
			})
			.where(eq(pendingRegistration.id, pending.id));

		const verificationLink = `${url.origin}/verify-email?token=${token}&auto=1`;
		const mailResult = await sendMail({
			to: pending.email,
			subject: '✉️ Kode Verifikasi Email Baru — NLC',
			html: buildVerificationEmail({
				fullName: pending.fullName,
				code: newCode,
				expiresInMinutes: 5,
				verificationLink
			}),
			text: `Kode verifikasi baru Anda adalah: ${newCode}\nAtau kunjungi: ${verificationLink}`
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
			message: `Kode verifikasi baru telah dikirim ke ${pending.email}`
		};
	},

	updateEmail: async ({ request, url }) => {
		const formData = await request.formData();
		const token = (formData.get('token') as string)?.trim();
		const newEmail = (formData.get('newEmail') as string)?.trim().toLowerCase();

		if (!token || !newEmail) {
			return fail(400, { emailError: 'Alamat email baru wajib diisi.' });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
			return fail(400, { emailError: 'Format alamat email tidak valid.' });
		}

		const pendingList = await db
			.select()
			.from(pendingRegistration)
			.where(eq(pendingRegistration.token, token))
			.limit(1);

		const pending = pendingList[0];

		if (!pending) {
			return fail(400, { emailError: 'Sesi pendaftaran tidak ditemukan. Silakan mendaftar kembali.' });
		}

		if (pending.email === newEmail) {
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

		// Buat kode OTP baru
		const newCode = generateVerificationCode();
		const hashedNewCode = hashVerificationCode(newCode);
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

		// Update email & OTP pada pendingRegistration
		await db
			.update(pendingRegistration)
			.set({
				email: newEmail,
				code: hashedNewCode,
				attempts: 0,
				resendCount: 0,
				expiresAt,
				createdAt: new Date()
			})
			.where(eq(pendingRegistration.id, pending.id));

		const verificationLink = `${url.origin}/verify-email?token=${token}&auto=1`;
		const mailResult = await sendMail({
			to: newEmail,
			subject: '✉️ Kode Verifikasi Email Pendaftaran Baru — NLC',
			html: buildVerificationEmail({
				fullName: pending.fullName,
				code: newCode,
				expiresInMinutes: 5,
				verificationLink
			}),
			text: `Halo ${pending.fullName},\n\nAlamat email pendaftaran Anda telah diperbarui. Kode verifikasi akun NLC Anda adalah: ${newCode}\nAtau kunjungi: ${verificationLink}\nKode ini berlaku selama 5 menit.`
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
