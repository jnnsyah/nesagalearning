import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, emailVerificationCode } from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { sendMail, generateVerificationCode, hashVerificationCode, buildVerificationEmail, getActiveEmailConfig } from '$lib/server/services/email.service';
import { isGoogleOAuthEnabled } from '$lib/server/auth/oauth';

import { authRateLimiter } from '$lib/server/utils/rate-limiter';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/siswa');
	}

	const emailConfig = await getActiveEmailConfig();

	return {
		isEmailConfigured: Boolean(emailConfig && emailConfig.provider !== 'disabled'),
		isGoogleEnabled: isGoogleOAuthEnabled()
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const ipAddress = getClientAddress() || request.headers.get('x-forwarded-for') || '127.0.0.1';
		const rateLimit = authRateLimiter.check(`register_${ipAddress}`, 5, 60000);
		if (!rateLimit.allowed) {
			return fail(429, {
				error: `Terlalu banyak pendaftaran akun. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.`,
				fullName: '',
				username: '',
				email: ''
			});
		}

		const formData = await request.formData();
		const fullName = (formData.get('fullName') as string)?.trim();
		const username = (formData.get('username') as string)?.trim().toLowerCase();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const password = (formData.get('password') as string)?.trim();
		const confirmPassword = (formData.get('confirmPassword') as string)?.trim();

		if (!fullName || !username || !email || !password || !confirmPassword) {
			return fail(400, {
				error: 'Semua kolom pendaftaran wajib diisi.',
				fullName,
				username,
				email
			});
		}

		if (!/^[a-z0-9_]{3,20}$/.test(username)) {
			return fail(400, {
				error: 'Username hanya boleh berisi huruf kecil, angka, dan garis bawah (3-20 karakter).',
				fullName,
				username,
				email
			});
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, {
				error: 'Format alamat email tidak valid.',
				fullName,
				username,
				email
			});
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Password minimal harus 8 karakter.',
				fullName,
				username,
				email
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Konfirmasi password tidak cocok dengan password baru.',
				fullName,
				username,
				email
			});
		}

		// Cek ketersediaan username & email
		const existingUsers = await db
			.select()
			.from(userTable)
			.where(or(eq(userTable.username, username), eq(userTable.email, email)))
			.limit(1);

		if (existingUsers.length > 0) {
			const found = existingUsers[0];
			if (found.username === username) {
				return fail(400, {
					error: 'Username tersebut sudah terdaftar. Silakan pilih username lain.',
					fullName,
					username,
					email
				});
			}
			return fail(400, {
				error: 'Alamat email tersebut sudah terdaftar. Silakan login atau pilih email lain.',
				fullName,
				username,
				email
			});
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);

		// Insert user baru dengan status belum verifikasi email
		const newUsers = await db
			.insert(userTable)
			.values({
				username,
				email,
				fullName,
				passwordHash,
				role: 'siswa',
				isEmailVerified: false,
				isActive: true
			})
			.returning();

		const newUser = newUsers[0];

		// Buat kode OTP 6-digit
		const code = generateVerificationCode();
		const hashCode = hashVerificationCode(code);
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

		await db.insert(emailVerificationCode).values({
			userId: newUser.id,
			email,
			code: hashCode,
			resendCount: 0,
			expiresAt
		});

		// Kirim email kode verifikasi
		const mailResult = await sendMail({
			to: email,
			subject: '✉️ Kode Verifikasi Email Pendaftaran — NLC',
			html: buildVerificationEmail({
				fullName,
				code,
				expiresInMinutes: 5
			}),
			text: `Halo ${fullName},\n\nKode verifikasi pendaftaran akun NLC Anda adalah: ${code}\nKode ini berlaku selama 5 menit.`
		});

		if (!mailResult.success) {
			return fail(500, {
				error: `Akun berhasil dibuat, namun gagal mengirim email verifikasi: ${mailResult.error}. Silakan coba kirim ulang dari halaman verifikasi.`,
				fullName,
				username,
				email
			});
		}

		// Redirect ke halaman verifikasi email OTP
		throw redirect(303, `/verify-email?email=${encodeURIComponent(email)}&userId=${newUser.id}`);
	}
};
