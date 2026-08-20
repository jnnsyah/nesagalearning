import { json, type RequestHandler } from '@sveltejs/kit';
import { AttendanceService } from '$lib/server/services/attendance.service';
import { manualAttendanceSchema } from '$lib/validators/attendance';
import { attendanceRateLimiter } from '$lib/server/utils/rate-limiter';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Silakan login terlebih dahulu.' }, { status: 401 });
	}

	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		return json({ success: false, message: 'Hanya Mentor dan Admin yang dapat melakukan presensi manual.' }, { status: 403 });
	}

	// Rate limiting: max 20 manual actions per minute
	const rateLimit = attendanceRateLimiter.check(`manual_${locals.user.id}_${getClientAddress()}`, 20, 60000);
	if (!rateLimit.allowed) {
		return json(
			{ success: false, message: `Batas aksi presensi tercapai. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.` },
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();
		const parseResult = manualAttendanceSchema.safeParse(body);

		if (!parseResult.success) {
			return json(
				{
					success: false,
					message: parseResult.error.issues[0]?.message || 'Input presensi manual tidak valid.'
				},
				{ status: 400 }
			);
		}

		const result = await AttendanceService.recordAttendanceManual(parseResult.data);

		return json({
			success: true,
			message: result.message,
			data: result.attendance,
			points: result.points
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				message: err.message || 'Gagal mencatat presensi manual.'
			},
			{ status: 400 }
		);
	}
};
