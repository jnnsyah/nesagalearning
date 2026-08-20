import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { systemEmailConfig } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { encryptPassword, sendMail, buildResetPasswordEmail } from '$lib/server/services/email.service';

export const load: PageServerLoad = async () => {
	const configs = await db
		.select()
		.from(systemEmailConfig)
		.orderBy(systemEmailConfig.createdAt);

	return { configs };
};

export const actions: Actions = {
	// Tambah / simpan konfigurasi email baru
	save: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id') as string | null;
		const label = (form.get('label') as string)?.trim();
		const senderName = (form.get('senderName') as string)?.trim();
		const senderEmail = (form.get('senderEmail') as string)?.trim();
		const provider = (form.get('provider') as string) ?? 'gmail';
		const smtpHost = (form.get('smtpHost') as string)?.trim() || null;
		const smtpPort = (form.get('smtpPort') as string)?.trim() || '587';
		const smtpUser = (form.get('smtpUser') as string)?.trim() || null;
		const smtpPassRaw = (form.get('smtpPass') as string)?.trim() || null;

		if (!label || !senderName || !senderEmail) {
			return fail(400, { error: 'Label, nama pengirim, dan email pengirim wajib diisi.' });
		}

		// Enkripsi password jika diisi
		const smtpPassEncrypted = smtpPassRaw ? encryptPassword(smtpPassRaw) : null;

		if (id) {
			// Update existing
			const updateData: Record<string, unknown> = {
				label,
				senderName,
				senderEmail,
				provider,
				smtpHost,
				smtpPort,
				smtpUser,
				updatedAt: new Date()
			};
			// Hanya update password jika diisi (input kosong = pertahankan password lama)
			if (smtpPassEncrypted) {
				updateData.smtpPassEncrypted = smtpPassEncrypted;
			}

			await db
				.update(systemEmailConfig)
				.set(updateData)
				.where(eq(systemEmailConfig.id, parseInt(id)));
		} else {
			// Insert baru
			await db.insert(systemEmailConfig).values({
				label,
				senderName,
				senderEmail,
				provider,
				smtpHost,
				smtpPort,
				smtpUser,
				smtpPassEncrypted,
				isActive: false
			});
		}

		return { success: true, message: 'Konfigurasi email berhasil disimpan.' };
	},

	// Aktifkan salah satu konfigurasi sebagai pengirim aktif
	activate: async ({ request }) => {
		const form = await request.formData();
		const id = parseInt(form.get('id') as string);

		if (!id) return fail(400, { error: 'ID tidak valid.' });

		// Nonaktifkan semua dulu
		await db.update(systemEmailConfig).set({ isActive: false });

		// Aktifkan yang dipilih
		await db
			.update(systemEmailConfig)
			.set({ isActive: true, updatedAt: new Date() })
			.where(eq(systemEmailConfig.id, id));

		return { success: true, message: 'Konfigurasi email berhasil diaktifkan.' };
	},

	// Hapus konfigurasi
	delete: async ({ request }) => {
		const form = await request.formData();
		const id = parseInt(form.get('id') as string);

		if (!id) return fail(400, { error: 'ID tidak valid.' });

		await db.delete(systemEmailConfig).where(eq(systemEmailConfig.id, id));
		return { success: true, message: 'Konfigurasi email berhasil dihapus.' };
	},

	// Tes kirim email menggunakan konfigurasi aktif
	test: async ({ request }) => {
		const form = await request.formData();
		const toEmail = (form.get('toEmail') as string)?.trim();

		if (!toEmail) return fail(400, { error: 'Email tujuan wajib diisi untuk tes.' });

		const result = await sendMail({
			to: toEmail,
			subject: '✅ Tes Email — Sistem NLC',
			html: buildResetPasswordEmail({
				fullName: 'Administrator',
				resetLink: 'https://nlc.example.com/reset-password?token=CONTOH_TOKEN',
				expiresInMinutes: 30
			}),
			text: 'Ini adalah email percobaan dari sistem NLC. Jika Anda menerima email ini, konfigurasi email berfungsi dengan baik.'
		});

		if (!result.success) {
			return fail(500, { error: result.error ?? 'Gagal mengirim email tes.' });
		}

		return { success: true, message: `Email tes berhasil dikirim ke ${toEmail}` };
	}
};
