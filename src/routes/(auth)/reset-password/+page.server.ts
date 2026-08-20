import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, passwordResetToken, session } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ url }) => {
	const rawToken = url.searchParams.get('token');

	if (!rawToken) {
		return {
			invalidToken: true,
			error: 'Tautan reset password tidak valid. Token tidak ditemukan.'
		};
	}

	const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

	const tokens = await db
		.select()
		.from(passwordResetToken)
		.where(and(eq(passwordResetToken.token, hashedToken), isNull(passwordResetToken.usedAt)))
		.limit(1);

	const tokenRecord = tokens[0];

	if (!tokenRecord) {
		return {
			invalidToken: true,
			error: 'Tautan reset password tidak valid atau sudah pernah digunakan.'
		};
	}

	if (new Date() > tokenRecord.expiresAt) {
		return {
			invalidToken: true,
			error: 'Tautan reset password telah kadaluarsa (berlaku 30 menit). Silakan ajukan ulang.'
		};
	}

	return {
		invalidToken: false,
		token: rawToken
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const rawToken = (formData.get('token') as string)?.trim();
		const password = (formData.get('password') as string)?.trim();
		const confirmPassword = (formData.get('confirmPassword') as string)?.trim();

		if (!rawToken) {
			return fail(400, { error: 'Token reset password tidak ditemukan.' });
		}

		if (!password || !confirmPassword) {
			return fail(400, { error: 'Password baru dan konfirmasi password wajib diisi.' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password baru minimal harus 8 karakter.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Konfirmasi password tidak cocok dengan password baru.' });
		}

		// Validasi ulang token dari database
		const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
		const tokens = await db
			.select()
			.from(passwordResetToken)
			.where(and(eq(passwordResetToken.token, hashedToken), isNull(passwordResetToken.usedAt)))
			.limit(1);

		const tokenRecord = tokens[0];

		if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
			return fail(400, {
				error: 'Tautan reset password sudah tidak berlaku. Silakan minta tautan baru.'
			});
		}

		// Hash password baru
		const passwordHash = await bcrypt.hash(password, 10);

		// Update password user
		await db
			.update(user)
			.set({
				passwordHash,
				updatedAt: new Date()
			})
			.where(eq(user.id, tokenRecord.userId));

		// Tandai token telah digunakan
		await db
			.update(passwordResetToken)
			.set({ usedAt: new Date() })
			.where(eq(passwordResetToken.id, tokenRecord.id));

		// Hapus semua sesi login aktif user untuk keamanan
		await db.delete(session).where(eq(session.userId, tokenRecord.userId));

		// Redirect ke halaman login dengan notifikasi sukses
		throw redirect(303, '/login?reset=success');
	}
};
