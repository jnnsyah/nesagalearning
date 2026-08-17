import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { SubmissionService } from '$lib/server/services/submission.service';
import { reviewSubmissionSchema } from '$lib/validators/submission';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		throw error(403, 'Akses ditolak: Hanya Mentor atau Admin yang dapat menguji/menilai tugas.');
	}

	try {
		const [submissions, meetingSummaries] = await Promise.all([
			SubmissionService.getAllSubmissions(),
			SubmissionService.getMeetingTasksSummary()
		]);
		return {
			user: locals.user,
			submissions,
			meetingSummaries
		};
	} catch (err: any) {
		console.error('Error loading submissions for mentor:', err);
		return {
			user: locals.user,
			submissions: [],
			meetingSummaries: [],
			error: err.message
		};
	}
};

export const actions: Actions = {
	review: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'mentor' && locals.user.role !== 'admin')) {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const rawSubmissionId = formData.get('submissionId');
		const rawStatus = formData.get('status');
		const rawFeedback = formData.get('feedback');

		const submissionId = Number(rawSubmissionId);
		const status = String(rawStatus);
		const feedback = rawFeedback ? String(rawFeedback).trim() : undefined;

		const parseResult = reviewSubmissionSchema.safeParse({
			submissionId,
			status,
			feedback
		});

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0]?.message || 'Input tidak valid';
			return fail(400, { message: firstError });
		}

		try {
			await SubmissionService.reviewSubmission({
				reviewerId: locals.user.id,
				submissionId: parseResult.data.submissionId,
				status: parseResult.data.status,
				feedback: parseResult.data.feedback
			});

			return {
				success: true,
				message:
					parseResult.data.status === 'approved'
						? 'Tugas berhasil disetujui! Poin telah ditambahkan ke siswa.'
						: 'Permintaan revisi tugas telah dikirimkan ke siswa.'
			};
		} catch (err: any) {
			console.error('Failed to review submission:', err);
			return fail(500, { message: err.message || 'Gagal menyimpan penilaian tugas.' });
		}
	}
};
