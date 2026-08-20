import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { emailOutbox } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { sendMail } from '$lib/server/services/email.service';

export const load: PageServerLoad = async () => {
	const logs = await db
		.select()
		.from(emailOutbox)
		.orderBy(desc(emailOutbox.createdAt))
		.limit(100);

	const totalSent = logs.filter((l) => l.status === 'sent').length;
	const totalFailed = logs.filter((l) => l.status === 'failed').length;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayCount = logs.filter((l) => new Date(l.createdAt) >= today).length;

	return {
		logs,
		stats: {
			total: logs.length,
			sent: totalSent,
			failed: totalFailed,
			today: todayCount
		}
	};
};

export const actions: Actions = {
	resend: async ({ request }) => {
		const form = await request.formData();
		const id = parseInt(form.get('id') as string);

		if (!id) return fail(400, { error: 'ID log email tidak valid.' });

		const logs = await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).limit(1);
		const targetLog = logs[0];

		if (!targetLog) return fail(404, { error: 'Log email tidak ditemukan.' });

		const result = await sendMail({
			to: targetLog.recipientEmail,
			subject: targetLog.subject,
			html: targetLog.bodyHtml,
			text: targetLog.bodyText ?? undefined
		});

		if (!result.success) {
			return fail(500, { error: result.error ?? 'Gagal mengirim ulang email.' });
		}

		return { success: true, message: `Email berhasil dikirim ulang ke ${targetLog.recipientEmail}` };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = parseInt(form.get('id') as string);

		if (!id) return fail(400, { error: 'ID log tidak valid.' });

		await db.delete(emailOutbox).where(eq(emailOutbox.id, id));
		return { success: true, message: 'Log email berhasil dihapus.' };
	}
};
