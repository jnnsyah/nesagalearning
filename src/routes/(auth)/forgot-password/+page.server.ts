import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, passwordResetToken } from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { sendMail, buildResetPasswordEmail, getActiveEmailConfig } from '$lib/server/services/email.service';

export const load: PageServerLoad = async () => {
	const emailConfig = await getActiveEmailConfig();
	return {
		isEmailConfigured: Boolean(emailConfig && emailConfig.provider !== 'disabled')
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const identifier = (formData.get('identifier') as string)?.trim();

		if (!identifier) {
			return fail(400, { error: 'Masukkan email atau username akun Anda.', identifier });
		}

		// Cari user berdasarkan email atau username
		const users = await db
			.select()
			.from(user)
			.where(or(eq(user.email, identifier), eq(user.username, identifier)))
			.limit(1);

		const targetUser = users[0];

		// Untuk keamanan, selalu tampilkan pesan sukses agar penyerang tidak bisa menebak email/username terdaftar (privacy anti-enumeration)
		const successMessage =
			'Jika akun/email tersebut terdaftar di sistem, instruksi reset password telah dikirim ke alamat email terkait. Silakan periksa inbox atau folder spam Anda.';

		if (!targetUser) {
			return { success: true, message: successMessage };
		}

		if (!targetUser.email) {
			return fail(400, {
				error: 'Akun ini tidak memiliki alamat email terdaftar. Silakan hubungi Administrator untuk mereset password Anda.',
				identifier
			});
		}

		if (!targetUser.isActive) {
			return fail(400, {
				error: 'Akun Anda sedang nonaktif. Silakan hubungi Administrator.',
				identifier
			});
		}

		// Generate token acak (32 bytes = 64 hex char)
		const rawToken = crypto.randomBytes(32).toString('hex');
		const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
		const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 menit

		// Simpan token terenkripsi sha256 ke DB
		await db.insert(passwordResetToken).values({
			userId: targetUser.id,
			token: hashedToken,
			expiresAt
		});

		// Dapatkan base URL aplikasi dari env atau request URL origin
		const baseUrl = process.env.PUBLIC_APP_URL || url.origin;
		const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

		// Kirim email reset password
		const emailResult = await sendMail({
			to: targetUser.email,
			subject: '🔐 Reset Password Akun — Nesaga Learning Community',
			html: buildResetPasswordEmail({
				fullName: targetUser.fullName,
				resetLink,
				expiresInMinutes: 30
			}),
			text: `Halo ${targetUser.fullName},\n\nPermintaan reset password diterima. Silakan buka tautan berikut untuk membuat password baru:\n${resetLink}\n\nTautan ini berlaku selama 30 menit.`
		});

		if (!emailResult.success) {
			return fail(500, {
				error: `Gagal mengirim email: ${emailResult.error}`,
				identifier
			});
		}

		return {
			success: true,
			message: successMessage
		};
	}
};
