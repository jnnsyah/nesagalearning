import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { AdvisorDetailService } from '$lib/server/services/advisor-detail.service';
import { ProgressService } from '$lib/server/services/progress.service';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema/auth';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '$lib/server/db/schema/academic';
import { curriculumTrack } from '$lib/server/db/schema/curriculum';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'siswa') {
		throw error(403, 'Akses khusus siswa.');
	}

	const studentId = Number(locals.user.id);

	// Fetch fresh user data
	const [userData] = await db
		.select({
			id: userTable.id,
			username: userTable.username,
			fullName: userTable.fullName,
			avatarUrl: userTable.avatarUrl,
			email: userTable.email,
			nisn: userTable.nisn
		})
		.from(userTable)
		.where(eq(userTable.id, studentId))
		.limit(1);

	// Attempt to get comprehensive student advisor detail (same data as teacher sees)
	const detailData = await AdvisorDetailService.getStudentDetail(studentId);

	// Get student active class membership
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
		.where(and(eq(keanggotaan.userId, studentId), eq(keanggotaan.status, 'aktif')))
		.limit(1);

	let phaseProgress: any[] = [];
	let trackInfo: any = null;

	if (activeMembership) {
		const [kelasTrackData] = await db
			.select({
				trackId: curriculumTrack.id,
				trackTitle: curriculumTrack.title,
				trackDescription: curriculumTrack.description,
				tingkatName: tingkat.name
			})
			.from(kelasInstance)
			.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.id, activeMembership.kelasInstanceId))
			.limit(1);

		trackInfo = kelasTrackData || null;

		phaseProgress = await ProgressService.getStudentPhaseProgress(
			studentId,
			activeMembership.kelasInstanceId
		);
	}

	const historicalProgress = await ProgressService.getStudentHistoricalProgress(studentId);

	return {
		user: userData || locals.user,
		activeMembership: activeMembership || null,
		trackInfo,
		detailData: detailData || {
			student: {
				id: studentId,
				fullName: userData?.fullName || locals.user.fullName || 'Siswa',
				username: userData?.username || locals.user.username || '',
				avatarUrl: userData?.avatarUrl || null,
				kelasId: activeMembership?.kelasInstanceId || 0,
				kelasName: activeMembership?.kelasName || 'Belum Terdaftar Kelas',
				tahunAjaranName: activeMembership?.tahunAjaranName || '-',
				tingkatName: activeMembership?.tingkatName || '-',
				membershipStatus: 'aktif'
			},
			summary: {
				totalSessions: 0,
				attendedCount: 0,
				attendanceRate: 100,
				totalTasks: 0,
				approvedTasksCount: 0,
				taskCompletionRate: 100,
				currentStreak: 0,
				maxStreak: 0,
				totalPoints: 0,
				riskLevel: 'SEHAT' as const,
				alertReasons: []
			},
			notes: [],
			attendanceLogs: [],
			submissionLogs: []
		},
		phaseProgress,
		historicalProgress
	};
};
