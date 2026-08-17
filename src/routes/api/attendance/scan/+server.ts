import { json, type RequestHandler } from '@sveltejs/kit';
import { AttendanceService } from '$lib/server/services/attendance.service';
import { scanAttendanceSchema } from '$lib/validators/attendance';
import { attendanceRateLimiter } from '$lib/server/utils/rate-limiter';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Silakan login terlebih dahulu untuk mencatat presensi.' }, { status: 401 });
	}

	// Rate limiting: key by userId or client IP
	const clientKey = `scan_${locals.user.id}_${getClientAddress()}`;
	const rateLimit = attendanceRateLimiter.check(clientKey, 5, 10000);

	if (!rateLimit.allowed) {
		return json(
			{
				success: false,
				message: `Terlalu banyak percobaaan scan. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.`
			},
			{ status: 429 }
		);
	}

	try {
		const body = await request.json();
		const parseResult = scanAttendanceSchema.safeParse(body);

		if (!parseResult.success) {
			return json(
				{
					success: false,
					message: parseResult.error.issues[0]?.message || 'Input token presensi tidak valid.'
				},
				{ status: 400 }
			);
		}

		const result = await AttendanceService.recordAttendanceViaQR(Number(locals.user.id), parseResult.data.token);

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
				message: err.message || 'Gagal mencatatkan presensi.'
			},
			{ status: 400 }
		);
	}
};
