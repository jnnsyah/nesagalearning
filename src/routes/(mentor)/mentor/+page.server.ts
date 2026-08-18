import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { pertemuan } from '$lib/server/db/schema/session';
import { task, submission } from '$lib/server/db/schema/task';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { user } from '$lib/server/db/schema/auth';
import { eq, gte, desc, asc, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const todayIsoStr = new Date().toISOString().slice(0, 10);

	const [
		totalStudentsRes,
		pendingSubmissionsRes,
		nextSessionRes,
		recentMeetingsRes,
		pendingSubmissionsListRes
	] = await Promise.all([
		// 1. Total Active Students
		db.select({ count: count() })
			.from(keanggotaan)
			.where(eq(keanggotaan.status, 'aktif')),

		// 2. Pending Submissions Count
		db.select({ count: count() })
			.from(submission)
			.where(eq(submission.status, 'pending')),

		// 3. Next Upcoming / Live Session
		db.select({
			id: pertemuan.id,
			title: pertemuan.title,
			sessionDate: pertemuan.sessionDate,
			startTime: pertemuan.startTime,
			endTime: pertemuan.endTime,
			location: pertemuan.location,
			kelasName: kelasInstance.name
		})
		.from(pertemuan)
		.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
		.where(gte(pertemuan.sessionDate, todayIsoStr))
		.orderBy(asc(pertemuan.sessionDate), asc(pertemuan.startTime))
		.limit(1),

		// 4. Recent 5 Meetings
		db.select({
			id: pertemuan.id,
			title: pertemuan.title,
			sessionDate: pertemuan.sessionDate,
			startTime: pertemuan.startTime,
			endTime: pertemuan.endTime,
			activityType: pertemuan.activityType,
			kelasName: kelasInstance.name
		})
		.from(pertemuan)
		.innerJoin(kelasInstance, eq(pertemuan.kelasInstanceId, kelasInstance.id))
		.orderBy(desc(pertemuan.sessionDate), desc(pertemuan.startTime))
		.limit(5),

		// 5. Pending Submissions Queue List (Latest 5)
		db.select({
			submissionId: submission.id,
			taskId: task.id,
			taskTitle: task.title,
			studentName: user.fullName,
			studentAvatar: user.avatarUrl,
			submittedAt: submission.submittedAt,
			status: submission.status
		})
		.from(submission)
		.innerJoin(task, eq(submission.taskId, task.id))
		.innerJoin(user, eq(submission.userId, user.id))
		.where(eq(submission.status, 'pending'))
		.orderBy(desc(submission.submittedAt))
		.limit(5)
	]);

	return {
		user: locals.user,
		stats: {
			totalStudents: totalStudentsRes[0]?.count ?? 0,
			pendingSubmissions: pendingSubmissionsRes[0]?.count ?? 0,
			nextSession: nextSessionRes[0] || null
		},
		recentMeetings: recentMeetingsRes,
		pendingSubmissionsQueue: pendingSubmissionsListRes
	};
};
