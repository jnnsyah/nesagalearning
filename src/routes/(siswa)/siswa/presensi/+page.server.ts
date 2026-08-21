import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { attendance, pertemuan } from '$lib/server/db/schema/session';
import { streakCounter } from '$lib/server/db/schema/gamification';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		const tokenParam = url.searchParams.get('token');
		const redirectTo = tokenParam
			? `/login?redirectTo=${encodeURIComponent(`/siswa/presensi?token=${tokenParam}`)}`
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
			attendanceLogs: [],
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

	// 3. Fetch all meetings for this class
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

	// 4. Fetch student attendance records
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

	// 5. Build timeline logs & statistics
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

	return {
		user: locals.user,
		membership: membershipRec,
		attendanceLogs,
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
