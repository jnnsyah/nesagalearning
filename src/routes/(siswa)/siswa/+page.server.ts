import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '$lib/server/db/schema/academic';
import { eq, and } from 'drizzle-orm';
import { ProgressService } from '$lib/server/services/progress.service';
import { ProfileService } from '$lib/server/services/profile.service';
import { SubmissionService } from '$lib/server/services/submission.service';
import { submitTaskSchema } from '$lib/validators/submission';

import { user as userTable } from '$lib/server/db/schema/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'siswa') {
		throw error(403, 'Akses khusus siswa.');
	}

	const userId = Number(locals.user.id);

	// Fetch fresh user record (termasuk NISN)
	const [userData] = await db
		.select({
			id: userTable.id,
			username: userTable.username,
			fullName: userTable.fullName,
			email: userTable.email,
			nisn: userTable.nisn,
			role: userTable.role,
			avatarUrl: userTable.avatarUrl,
			isEmailVerified: userTable.isEmailVerified
		})
		.from(userTable)
		.where(eq(userTable.id, userId))
		.limit(1);

	// Fetch student's active class membership
	const [activeMembership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name,
			tahunAjaranName: tahunAjaran.name,
			tingkatName: tingkat.name
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
		.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')))
		.limit(1);

	let phaseProgress: any[] = [];
	let pendingTasks: any[] = [];

	if (activeMembership) {
		phaseProgress = await ProgressService.getStudentPhaseProgress(
			userId,
			activeMembership.kelasInstanceId
		);

		const allTasks = await SubmissionService.getStudentTasksWithStatus(
			userId,
			activeMembership.kelasInstanceId
		);

		pendingTasks = allTasks.filter(
			(t) => !t.submission || t.submission.status === 'pending' || t.submission.status === 'revisi'
		);
	}

	// Fetch historical grade progress (read-only) for promoted/past memberships
	const historicalProgress = await ProgressService.getStudentHistoricalProgress(userId);

	// Fetch full profile data (points, streak, attendance count)
	const profileData = await ProfileService.getUserProfileData(userId);

	const isNisnMissing = !userData?.nisn || userData.nisn.trim() === '';
	const isClassUnassigned = !activeMembership;

	return {
		user: userData || locals.user,
		activeMembership: activeMembership || null,
		phaseProgress,
		historicalProgress,
		pendingTasks,
		profileStats: profileData?.stats || null,
		completeness: {
			isNisnMissing,
			isClassUnassigned,
			isIncomplete: isNisnMissing || isClassUnassigned
		}
	};
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
				userId: Number(locals.user.id),
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
	}
};
