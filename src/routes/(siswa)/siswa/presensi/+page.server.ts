import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance } from '$lib/server/db/schema/academic';
import { attendance, pertemuan } from '$lib/server/db/schema/session';
import { pointLog, streakCounter } from '$lib/server/db/schema/gamification';
import { eq, and, desc } from 'drizzle-orm';
import { calculateStreak } from '$lib/server/services/streak.service';

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

	// 1. Get student's active membership
	const membership = await db.query.keanggotaan.findFirst({
		where: and(eq(keanggotaan.userId, userId), eq(keanggotaan.status, 'aktif'))
	});

	let streakInfo = { currentStreak: 0, maxStreak: 0 };
	let attendanceHistory: any[] = [];
	let availableSessions: any[] = [];

	if (membership) {
		// 2. Fetch streak counter
		const streakRec = await db.query.streakCounter.findFirst({
			where: and(
				eq(streakCounter.userId, userId),
				eq(streakCounter.kelasInstanceId, membership.kelasInstanceId)
			)
		});

		if (streakRec) {
			streakInfo = {
				currentStreak: streakRec.currentStreak,
				maxStreak: streakRec.maxStreak
			};
		}

		// 3. Fetch student attendance history
		attendanceHistory = await db
			.select({
				id: attendance.id,
				pertemuanId: attendance.pertemuanId,
				sessionTitle: pertemuan.title,
				sessionDate: pertemuan.sessionDate,
				activityType: pertemuan.activityType,
				isWeekend: pertemuan.isWeekend,
				method: attendance.method,
				status: attendance.status,
				recordedAt: attendance.recordedAt
			})
			.from(attendance)
			.innerJoin(pertemuan, eq(attendance.pertemuanId, pertemuan.id))
			.where(and(eq(attendance.userId, userId), eq(pertemuan.kelasInstanceId, membership.kelasInstanceId)))
			.orderBy(desc(pertemuan.sessionDate), desc(attendance.recordedAt));

		// 4. Fetch active/recent meetings for this kelas
		availableSessions = await db
			.select({
				id: pertemuan.id,
				title: pertemuan.title,
				sessionDate: pertemuan.sessionDate,
				startTime: pertemuan.startTime,
				endTime: pertemuan.endTime,
				location: pertemuan.location,
				isWeekend: pertemuan.isWeekend
			})
			.from(pertemuan)
			.where(eq(pertemuan.kelasInstanceId, membership.kelasInstanceId))
			.orderBy(desc(pertemuan.sessionDate))
			.limit(5);
	}

	return {
		streakInfo,
		attendanceHistory,
		availableSessions,
		urlToken
	};
};
