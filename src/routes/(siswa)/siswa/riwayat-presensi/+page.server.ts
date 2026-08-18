import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { attendance, pertemuan } from '$lib/server/db/schema/session';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { streakCounter } from '$lib/server/db/schema/gamification';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = Number(locals.user.id);

	// 1. Fetch student active class membership
	const [membership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.where(and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif')));

	if (!membership) {
		return {
			user: locals.user,
			membership: null,
			attendanceLogs: [],
			streakInfo: { currentStreak: 0, maxStreak: 0 },
			stats: { totalSessions: 0, totalHadir: 0, totalExcused: 0, attendancePercentage: 0 }
		};
	}

	const kelasInstanceId = membership.kelasInstanceId;

	// 2. Fetch all sessions in this class up to today
	const sessions = await db
		.select({
			id: pertemuan.id,
			title: pertemuan.title,
			activityType: pertemuan.activityType,
			sessionDate: pertemuan.sessionDate,
			startTime: pertemuan.startTime,
			endTime: pertemuan.endTime,
			location: pertemuan.location,
			isWeekend: pertemuan.isWeekend
		})
		.from(pertemuan)
		.where(eq(pertemuan.kelasInstanceId, kelasInstanceId))
		.orderBy(desc(pertemuan.sessionDate), desc(pertemuan.startTime));

	// 3. Fetch student attendance records
	const attendanceRecords = await db
		.select({
			id: attendance.id,
			pertemuanId: attendance.pertemuanId,
			method: attendance.method,
			status: attendance.status,
			manualReason: attendance.manualReason,
			recordedAt: attendance.recordedAt
		})
		.from(attendance)
		.where(eq(attendance.userId, userId));

	const attMap = new Map(attendanceRecords.map((a) => [a.pertemuanId, a]));

	// 4. Combine session & attendance into chronological timeline
	let totalHadir = 0;
	let totalExcused = 0;

	const attendanceLogs = sessions.map((s) => {
		const att = attMap.get(s.id);
		let status: 'hadir' | 'excused' | 'absen' = 'absen';
		if (att) {
			status = att.status === 'hadir' ? 'hadir' : 'excused';
			if (status === 'hadir') totalHadir++;
			if (status === 'excused') totalExcused++;
		}
		return {
			session: s,
			attendance: att || null,
			status
		};
	});

	const totalSessions = sessions.length;
	const attendancePercentage = totalSessions > 0 ? Math.round(((totalHadir + totalExcused) / totalSessions) * 100) : 100;

	// 5. Fetch streak info
	const [streakRecord] = await db
		.select({
			currentStreak: streakCounter.currentStreak,
			maxStreak: streakCounter.maxStreak,
			lastAttendedAt: streakCounter.lastAttendedAt
		})
		.from(streakCounter)
		.where(and(eq(streakCounter.userId, userId), eq(streakCounter.kelasInstanceId, kelasInstanceId)));

	return {
		user: locals.user,
		membership,
		attendanceLogs,
		streakInfo: streakRecord || { currentStreak: 0, maxStreak: 0, lastAttendedAt: null },
		stats: {
			totalSessions,
			totalHadir,
			totalExcused,
			attendancePercentage
		}
	};
};
