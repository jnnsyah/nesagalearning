import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PertemuanService } from '$lib/server/services/pertemuan.service';
import { AttendanceService } from '$lib/server/services/attendance.service';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}

	// Fetch all meetings to populate selector
	const allMeetings = await PertemuanService.getAllPertemuan();

	const pertemuanIdParam = url.searchParams.get('pertemuanId');
	let selectedPertemuanId = pertemuanIdParam ? Number(pertemuanIdParam) : null;

	if (!selectedPertemuanId && allMeetings.length > 0) {
		selectedPertemuanId = allMeetings[0].id;
	}

	let selectedMeeting = null;
	let attendanceList: any[] = [];
	let activeToken = null;

	if (selectedPertemuanId) {
		selectedMeeting = await PertemuanService.getPertemuanById(selectedPertemuanId);
		if (selectedMeeting) {
			const attendanceData = await AttendanceService.getAttendanceListForPertemuan(selectedPertemuanId);
			attendanceList = attendanceData.students;
			activeToken = await AttendanceService.getLatestActiveToken(selectedPertemuanId);
		}
	}

	let isOngoing = false;
	if (selectedMeeting) {
		isOngoing = AttendanceService.isMeetingOngoing(selectedMeeting);
	}

	return {
		allMeetings,
		selectedPertemuanId,
		selectedMeeting,
		attendanceList,
		activeToken,
		isOngoing
	};
};
