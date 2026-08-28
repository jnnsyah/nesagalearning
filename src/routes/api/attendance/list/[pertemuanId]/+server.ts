import { json, type RequestHandler } from '@sveltejs/kit';
import { AttendanceService } from '$lib/server/services/attendance.service';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Silakan login terlebih dahulu.' }, { status: 401 });
	}

	// [Security] Only mentor and admin can view full attendance lists for a session.
	// Siswa must not be able to enumerate other students' attendance data (IDOR).
	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		return json(
			{ success: false, message: 'Hanya Mentor dan Admin yang dapat melihat daftar presensi.' },
			{ status: 403 }
		);
	}

	const pertemuanId = Number(params.pertemuanId);
	if (!pertemuanId || isNaN(pertemuanId)) {
		return json({ success: false, message: 'ID Pertemuan tidak valid.' }, { status: 400 });
	}

	try {
		const attendanceData = await AttendanceService.getAttendanceListForPertemuan(pertemuanId);

		return json({
			success: true,
			data: attendanceData
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				message: err.message || 'Gagal mengambil daftar presensi.'
			},
			{ status: 400 }
		);
	}
};
