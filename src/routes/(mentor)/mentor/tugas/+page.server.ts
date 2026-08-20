import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { SubmissionService } from '$lib/server/services/submission.service';
import { reviewSubmissionSchema } from '$lib/validators/submission';
import { db } from '$lib/server/db';
import { mentorAssignment } from '$lib/server/db/schema/academic';
import { submission, task } from '$lib/server/db/schema/task';
import { pertemuan } from '$lib/server/db/schema/session';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		throw error(403, 'Akses ditolak: Hanya Mentor atau Admin yang dapat menguji/menilai tugas.');
	}

	try {
		const assignedRows = await db
			.select({ kelasInstanceId: mentorAssignment.kelasInstanceId })
			.from(mentorAssignment)
			.where(eq(mentorAssignment.userId, Number(locals.user.id)));

		const assignedClassIds = assignedRows.map((r) => r.kelasInstanceId);

		const [submissions, meetingSummaries] = await Promise.all([
			SubmissionService.getAllSubmissions(),
			SubmissionService.getMeetingTasksSummary()
		]);
		return {
			user: locals.user,
			assignedClassIds,
			submissions,
			meetingSummaries
		};
	} catch (err: any) {
		console.error('Error loading submissions for mentor:', err);
		return {
			user: locals.user,
			assignedClassIds: [],
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

		// Read-Only Enforcement: If mentor HAS specific assigned classes, restrict review to those classes
		if (locals.user.role === 'mentor') {
			const assignedRows = await db
				.select({ kelasInstanceId: mentorAssignment.kelasInstanceId })
				.from(mentorAssignment)
				.where(eq(mentorAssignment.userId, Number(locals.user.id)));

			const assignedClassIds = assignedRows.map((r) => r.kelasInstanceId);

			if (assignedClassIds.length > 0) {
				const [subRecord] = await db
					.select({ kelasInstanceId: pertemuan.kelasInstanceId, studentUserId: submission.userId })
					.from(submission)
					.innerJoin(task, eq(submission.taskId, task.id))
					.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
					.where(eq(submission.id, parseResult.data.submissionId));

				let targetKelasId = subRecord?.kelasInstanceId;
				if (!targetKelasId && subRecord?.studentUserId) {
					const { keanggotaan } = await import('$lib/server/db/schema/academic');
					const [member] = await db
						.select({ kelasInstanceId: keanggotaan.kelasInstanceId })
						.from(keanggotaan)
						.where(and(eq(keanggotaan.userId, subRecord.studentUserId), eq(keanggotaan.status, 'aktif')));
					if (member) targetKelasId = member.kelasInstanceId;
				}

				if (targetKelasId && !assignedClassIds.includes(targetKelasId)) {
					return fail(403, {
						message: 'Akses Ditolak: Anda hanya memiliki akses Read-Only untuk tugas di kelas yang tidak Anda bina.'
					});
				}
			}
		}

		try {
			await SubmissionService.reviewSubmission({
				reviewerId: Number(locals.user.id),
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
