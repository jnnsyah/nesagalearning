import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { MentorStudentRosterService } from '$lib/server/services/mentor-student-roster.service';
import { db } from '$lib/server/db';
import { keanggotaan } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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

	const activeTab = (url.searchParams.get('tab') as 'curriculum' | 'attendance') || 'curriculum';
	const from = url.searchParams.get('from') || undefined;
	const trackId = url.searchParams.get('trackId') || undefined;
	const tahunAjaranId = url.searchParams.get('tahunAjaranId') || undefined;

	const [studentProgress, studentAttendanceHistory] = await Promise.all([
		MentorStudentRosterService.getStudentCurriculumProgress(studentUserId, kelasInstanceId),
		MentorStudentRosterService.getStudentAttendanceHistory(studentUserId, kelasInstanceId)
	]);

	if (!studentProgress && !studentAttendanceHistory) {
		throw error(404, 'Data detail siswa tidak ditemukan');
	}

	return {
		studentUserId,
		kelasInstanceId,
		activeTab,
		from,
		trackId,
		tahunAjaranId,
		studentProgress,
		studentAttendanceHistory
	};
};
