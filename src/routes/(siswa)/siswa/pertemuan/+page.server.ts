import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { attendance, attendanceToken, pertemuan } from '$lib/server/db/schema/session';
import { streakCounter } from '$lib/server/db/schema/gamification';
import { subPhase, phase } from '$lib/server/db/schema/curriculum';
import { task, submission } from '$lib/server/db/schema/task';
import { SubmissionService } from '$lib/server/services/submission.service';
import { AttendanceService } from '$lib/server/services/attendance.service';
import { submitTaskSchema } from '$lib/validators/submission';
import { eq, and, desc, inArray, gt } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		const tokenParam = url.searchParams.get('token');
		const redirectTo = tokenParam
			? `/login?redirectTo=${encodeURIComponent(`/siswa/pertemuan?token=${tokenParam}`)}`
			: '/login';
		throw redirect(302, redirectTo);
	}

	const urlToken = url.searchParams.get('token') ?? '';
	const userId = Number(locals.user.id);

	// 1. Fetch student's active class membership
	const [membershipRec] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));

	if (!membershipRec) {
		return {
			user: locals.user,
			membership: null,
			meetings: [],
			streakInfo: { currentStreak: 0, maxStreak: 0 },
			stats: { totalSessions: 0, totalHadir: 0, totalExcused: 0, attendancePercentage: 0 },
			urlToken
		};
	}

	const kelasInstanceId = membershipRec.kelasInstanceId;

	// 2. Fetch streak info
	const [streakRecord] = await db
		.select({
			currentStreak: streakCounter.currentStreak,
			maxStreak: streakCounter.maxStreak
		})
		.from(streakCounter)
		.where(and(eq(streakCounter.userId, userId), eq(streakCounter.kelasInstanceId, kelasInstanceId)));

	// 3. Fetch all meetings for this class with subPhase and phase details
	const sessions = await db
		.select({
			id: pertemuan.id,
			title: pertemuan.title,
			activityType: pertemuan.activityType,
			sessionDate: pertemuan.sessionDate,
			startTime: pertemuan.startTime,
			endTime: pertemuan.endTime,
			location: pertemuan.location,
			materialUrl: pertemuan.materialUrl,
			isWeekend: pertemuan.isWeekend,
			subPhaseTitle: subPhase.title,
			phaseTitle: phase.title
		})
		.from(pertemuan)
		.innerJoin(subPhase, eq(pertemuan.subPhaseId, subPhase.id))
		.innerJoin(phase, eq(subPhase.phaseId, phase.id))
		.where(eq(pertemuan.kelasInstanceId, kelasInstanceId))
		.orderBy(desc(pertemuan.sessionDate), desc(pertemuan.startTime));

	// 4. Fetch student attendance records & active QR tokens
	const meetingIds = sessions.map((s) => s.id);

	const [attendanceRecords, activeTokens] = await Promise.all([
		db
			.select({
				id: attendance.id,
				pertemuanId: attendance.pertemuanId,
				method: attendance.method,
				status: attendance.status,
				manualReason: attendance.manualReason,
				recordedAt: attendance.recordedAt
			})
			.from(attendance)
			.where(eq(attendance.userId, userId)),

		meetingIds.length > 0
			? db
					.select({ pertemuanId: attendanceToken.pertemuanId })
					.from(attendanceToken)
					.where(
						and(
							inArray(attendanceToken.pertemuanId, meetingIds),
							eq(attendanceToken.isActive, true),
							gt(attendanceToken.expiresAt, new Date())
						)
					)
			: []
	]);

	const attMap = new Map(attendanceRecords.map((a) => [a.pertemuanId, a]));
	const activePertemuanSet = new Set(activeTokens.map((t) => t.pertemuanId));

	// 5. Fetch tasks linked to meetings and student's submissions
	let taskRecords: { id: number; pertemuanId: number; title: string; description: string | null; taskSize: string }[] = [];
	let userSubmissions: { id: number; taskId: number; link: string; status: string; feedback: string | null; submittedAt: Date }[] = [];

	if (meetingIds.length > 0) {
		taskRecords = await db
			.select({
				id: task.id,
				pertemuanId: task.pertemuanId,
				title: task.title,
				description: task.description,
				taskSize: task.taskSize
			})
			.from(task)
			// [Security] Scope to only meetings that belong to this student's class.
			// Without this filter, ALL tasks from ALL classes are returned (data leak).
			.where(inArray(task.pertemuanId, meetingIds));

		const taskIds = taskRecords.map((t) => t.id);
		if (taskIds.length > 0) {
			userSubmissions = await db
				.select({
					id: submission.id,
					taskId: submission.taskId,
					link: submission.link,
					status: submission.status,
					feedback: submission.feedback,
					submittedAt: submission.submittedAt
				})
				.from(submission)
				.where(and(eq(submission.userId, userId), inArray(submission.taskId, taskIds)));
		}
	}

	const taskMap = new Map(taskRecords.map((t) => [t.pertemuanId, t]));
	const subMap = new Map(userSubmissions.map((s) => [s.taskId, s]));

	// 6. Build meetings list with live status, attendance, and task submission details & compute stats
	let totalHadir = 0;
	let totalExcused = 0;

	const meetings = sessions.map((s) => {
		const att = attMap.get(s.id);
		let attStatus: 'hadir' | 'excused' | 'absen' | 'none' = 'none';
		if (att) {
			attStatus = att.status === 'hadir' ? 'hadir' : 'excused';
			if (attStatus === 'hadir') totalHadir++;
			if (attStatus === 'excused') totalExcused++;
		} else if (s.sessionDate < new Date().toISOString().slice(0, 10)) {
			attStatus = 'absen';
		}

		const t = taskMap.get(s.id);
		const sub = t ? subMap.get(t.id) : null;
		const isLive = activePertemuanSet.has(s.id) || AttendanceService.isMeetingOngoing(s);

		return {
			...s,
			isLive,
			attendance: att || null,
			attendanceStatus: attStatus,
			task: t ? { ...t, submission: sub || null } : null
		};
	});

	const totalSessions = sessions.length;
	const attendancePercentage = totalSessions > 0 ? Math.round(((totalHadir + totalExcused) / totalSessions) * 100) : 100;

	return {
		user: locals.user,
		membership: membershipRec,
		meetings,
		streakInfo: streakRecord || { currentStreak: 0, maxStreak: 0 },
		stats: {
			totalSessions,
			totalHadir,
			totalExcused,
			attendancePercentage
		},
		urlToken
	};
};

export const actions: Actions = {
	submitTask: async ({ request, locals }) => {
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
				action: 'submitTask',
				message: 'Link tugas berhasil dikirim ke mentor untuk diperiksa!'
			};
		} catch (err: any) {
			console.error('Failed to submit task from meeting drawer:', err);
			return fail(500, { message: err.message || 'Gagal mengirim tugas.' });
		}
	},

	cancelTask: async ({ request, locals }) => {
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
			await SubmissionService.cancelSubmission(Number(locals.user.id), submissionId);
			return {
				success: true,
				action: 'cancelTask',
				message: 'Pengiriman tugas berhasil dibatalkan.'
			};
		} catch (err: any) {
			console.error('Failed to cancel submission from meeting drawer:', err);
			return fail(500, { message: err.message || 'Gagal membatalkan pengiriman tugas.' });
		}
	}
};
