import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { pertemuan } from '$lib/server/db/schema/session';
import { submission, task } from '$lib/server/db/schema/task';
import { keanggotaan, kelasInstance, mentorAssignment } from '$lib/server/db/schema/academic';
import { eq, gte, desc, asc, count, inArray, and } from 'drizzle-orm';
import { SubmissionService } from '$lib/server/services/submission.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const mentorUserId = Number(locals.user.id);
	const todayIsoStr = new Date().toISOString().slice(0, 10);

	// Fetch class IDs strictly assigned to this mentor
	const assignedClasses = await db
		.select({ kelasInstanceId: mentorAssignment.kelasInstanceId })
		.from(mentorAssignment)
		.where(eq(mentorAssignment.userId, mentorUserId));

	const assignedClassIds = assignedClasses.map((c) => c.kelasInstanceId);

	// If mentor is unassigned, strictly return zeroed stats
	if (assignedClassIds.length === 0) {
		return {
			user: locals.user,
			stats: {
				totalStudents: 0,
				pendingSubmissions: 0,
				nextSession: null
			},
			recentMeetings: [],
			meetingSummaries: []
		};
	}

	const [
		totalStudentsRes,
		pendingSubmissionsRes,
		nextSessionRes,
		recentMeetingsRes,
		meetingSummaries
	] = await Promise.all([
		// 1. Total Active Students in assigned classes
		db.select({ count: count() })
			.from(keanggotaan)
			.where(and(inArray(keanggotaan.kelasInstanceId, assignedClassIds), eq(keanggotaan.status, 'aktif'))),

		// 2. Pending & Revisi Submissions Count in assigned classes
		db.select({ count: count(submission.id) })
			.from(submission)
			.innerJoin(task, eq(submission.taskId, task.id))
			.innerJoin(pertemuan, eq(task.pertemuanId, pertemuan.id))
			.where(and(inArray(pertemuan.kelasInstanceId, assignedClassIds), inArray(submission.status, ['pending', 'revisi']))),

		// 3. Next Upcoming / Live Session in assigned classes
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
		.where(and(inArray(pertemuan.kelasInstanceId, assignedClassIds), gte(pertemuan.sessionDate, todayIsoStr)))
		.orderBy(asc(pertemuan.sessionDate), asc(pertemuan.startTime))
		.limit(1),

		// 4. Recent 5 Meetings in assigned classes
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
		.where(inArray(pertemuan.kelasInstanceId, assignedClassIds))
		.orderBy(desc(pertemuan.sessionDate), desc(pertemuan.startTime))
		.limit(5),

		// 5. Meeting Sessions with Tasks and live submission stats
		SubmissionService.getMeetingTasksSummary()
	]);

	return {
		user: locals.user,
		stats: {
			totalStudents: totalStudentsRes[0]?.count ?? 0,
			pendingSubmissions: pendingSubmissionsRes[0]?.count ?? 0,
			nextSession: nextSessionRes[0] || null
		},
		recentMeetings: recentMeetingsRes,
		meetingSummaries
	};
};
