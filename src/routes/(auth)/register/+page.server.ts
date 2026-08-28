import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, pendingRegistration } from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import {
	sendMail,
	generateVerificationCode,
	generateSecureToken,
	hashVerificationCode,
	buildVerificationEmail,
	getActiveEmailConfig
} from '$lib/server/services/email.service';
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
	default: async ({ request, url, getClientAddress }) => {
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

		// Bersihkan draf pendaftaran yang sudah expired
		await db.delete(pendingRegistration).where(sql.raw('expires_at <= NOW()'));

		// Cek apakah username atau email sudah terdaftar resmi di tabel `user`
		const existingUsers = await db
			.select()
			.from(userTable)
			.where(or(eq(userTable.username, username), eq(userTable.email, email)))
			.limit(1);

		if (existingUsers.length > 0) {
			const found = existingUsers[0];
			if (found.username === username) {
				return fail(400, {
					error: 'Username tersebut sudah terdaftar. Silakan pilih username lain atau login.',
					fullName,
					username,
					email
				});
			}
			return fail(400, {
				error: 'Alamat email tersebut sudah terdaftar. Silakan login atau gunakan email lain.',
				fullName,
				username,
				email
			});
		}

		// Hapus draf pending lama jika email atau username ini pernah dicoba mendaftar sebelumnya (Auto-Overwrite)
		await db
			.delete(pendingRegistration)
			.where(or(eq(pendingRegistration.email, email), eq(pendingRegistration.username, username)));

		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);

		// Buat token acak aman (64 hex) & kode OTP 6-digit
		const token = generateSecureToken();
		const code = generateVerificationCode();
		const hashCode = hashVerificationCode(code);
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

		// Simpan ke tabel staging sementara (Deferred User Creation)
		await db.insert(pendingRegistration).values({
			token,
			fullName,
			username,
			email,
			passwordHash,
			code: hashCode,
			resendCount: 0,
			attempts: 0,
			expiresAt
		});

		// Kirim email kode verifikasi
		const verificationLink = `${url.origin}/verify-email?token=${token}`;
		const mailResult = await sendMail({
			to: email,
			subject: '✉️ Kode Verifikasi Email Pendaftaran — NLC',
			html: buildVerificationEmail({
				fullName,
				code,
				expiresInMinutes: 5,
				verificationLink
			}),
			text: `Halo ${fullName},\n\nKode verifikasi pendaftaran akun NLC Anda adalah: ${code}\nAtau buka tautan verifikasi: ${verificationLink}\nKode ini berlaku selama 5 menit.`
		});

		if (!mailResult.success) {
			return fail(500, {
				error: `Gagal mengirim email verifikasi: ${mailResult.error}. Silakan periksa kembali email Anda dan coba lagi.`,
				fullName,
				username,
				email
			});
		}

		// Redirect ke halaman verifikasi email dengan token acak yang aman
		throw redirect(303, `/verify-email?token=${token}`);
	}
};
