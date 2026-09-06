import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { MentorStudentRosterService } from '$lib/server/services/mentor-student-roster.service';
import { AdvisorDetailService } from '$lib/server/services/advisor-detail.service';
import { ProgressService } from '$lib/server/services/progress.service';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '$lib/server/db/schema/academic';
import { curriculumTrack } from '$lib/server/db/schema/curriculum';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const studentUserId = parseInt(params.id, 10);
	if (isNaN(studentUserId)) {
		throw error(400, 'ID Siswa tidak valid');
	}

	let kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');
	let kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	if (!kelasInstanceId) {
		const [userMembership] = await db
			.select({ kelasInstanceId: keanggotaan.kelasInstanceId })
			.from(keanggotaan)
			.where(eq(keanggotaan.userId, studentUserId));
		kelasInstanceId = userMembership?.kelasInstanceId;
	}

	if (!kelasInstanceId) {
		throw error(404, 'Data keanggotaan kelas siswa tidak ditemukan');
	}

	const activeTabParam = url.searchParams.get('tab') || 'track';
	const from = url.searchParams.get('from') || undefined;
	const trackIdParam = url.searchParams.get('trackId') || undefined;
	const tahunAjaranId = url.searchParams.get('tahunAjaranId') || undefined;

	// Parallel Data Fetching
	const [
		detailData,
		[activeMembership],
		studentProgress,
		studentAttendanceHistory
	] = await Promise.all([
		AdvisorDetailService.getStudentDetail(studentUserId),
		db
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
			.where(and(eq(keanggotaan.userId, studentUserId), eq(keanggotaan.kelasInstanceId, kelasInstanceId)))
			.limit(1),
		MentorStudentRosterService.getStudentCurriculumProgress(studentUserId, kelasInstanceId),
		MentorStudentRosterService.getStudentAttendanceHistory(studentUserId, kelasInstanceId)
	]);

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
			studentUserId,
			activeMembership.kelasInstanceId
		);
	}

	if (!studentProgress && !studentAttendanceHistory && !detailData) {
		throw error(404, 'Data detail siswa tidak ditemukan');
	}

	return {
		studentUserId,
		kelasInstanceId,
		activeTabParam,
		from,
		trackIdParam,
		tahunAjaranId,
		activeMembership: activeMembership || null,
		trackInfo,
		detailData,
		phaseProgress,
		studentProgress,
		studentAttendanceHistory
	};
};
