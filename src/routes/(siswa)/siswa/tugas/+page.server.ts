import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { SubmissionService } from '$lib/server/services/submission.service';
import { submitTaskSchema } from '$lib/validators/submission';
import { db } from '$lib/server/db';
import { keanggotaan } from '$lib/server/db/schema/academic';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'siswa') {
		throw error(403, 'Akses ditolak: Halaman ini khusus untuk Siswa.');
	}

	try {
		// Fetch student's active class membership
		const activeMembership = await db.query.keanggotaan.findFirst({
			where: and(eq(keanggotaan.userId, locals.user.id), eq(keanggotaan.status, 'aktif'))
		});

		if (!activeMembership) {
			return {
				user: locals.user,
				tasks: [],
				noClass: true
			};
		}

		const tasks = await SubmissionService.getStudentTasksWithStatus(
			locals.user.id,
			activeMembership.kelasInstanceId
		);

		return {
			user: locals.user,
			tasks,
			noClass: false
		};
	} catch (err: any) {
		console.error('Error loading student tasks:', err);
		return {
			user: locals.user,
			tasks: [],
			error: err.message
		};
	}
};

export const actions: Actions = {
	submit: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'siswa') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const rawTaskId = formData.get('taskId');
		const rawLink = formData.get('link');

		const taskId = Number(rawTaskId);
		const link = String(rawLink || '').trim();

		const parseResult = submitTaskSchema.safeParse({ taskId, link });

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0]?.message || 'Input link tugas tidak valid';
			return fail(400, { message: firstError });
		}

		try {
			await SubmissionService.submitTask({
				userId: locals.user.id,
				taskId: parseResult.data.taskId,
				link: parseResult.data.link
			});

			return {
				success: true,
				message: 'Link tugas berhasil dikirim ke mentor untuk diperiksa!'
			};
		} catch (err: any) {
			console.error('Failed to submit task:', err);
			return fail(500, { message: err.message || 'Gagal mengirim tugas.' });
		}
	},

	cancel: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'siswa') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const rawSubmissionId = formData.get('submissionId');
		const submissionId = Number(rawSubmissionId);

		if (!submissionId || isNaN(submissionId)) {
			return fail(400, { message: 'ID submisi tidak valid.' });
		}

		try {
			await SubmissionService.cancelSubmission(locals.user.id, submissionId);
			return {
				success: true,
				message: 'Pengiriman tugas berhasil dibatalkan.'
			};
		} catch (err: any) {
			console.error('Failed to cancel submission:', err);
			return fail(500, { message: err.message || 'Gagal membatalkan pengiriman tugas.' });
		}
	}
};
