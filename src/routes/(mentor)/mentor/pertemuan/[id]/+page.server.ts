import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PertemuanService } from '$lib/server/services/pertemuan.service';
import { AttendanceService } from '$lib/server/services/attendance.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const id = Number(params.id);
	if (!id || isNaN(id)) {
		throw error(400, 'ID Pertemuan tidak valid');
	}

	const meeting = await PertemuanService.getPertemuanById(id);
	if (!meeting) {
		throw error(404, 'Pertemuan tidak ditemukan');
	}

	const attendanceData = await AttendanceService.getAttendanceListForPertemuan(id);
	const activeToken = await AttendanceService.getLatestActiveToken(id);

	return {
		meeting,
		attendanceList: attendanceData.students,
		activeToken
	};
};
