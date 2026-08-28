import { json, type RequestHandler } from '@sveltejs/kit';
import { AttendanceService } from '$lib/server/services/attendance.service';
import { generateTokenSchema } from '$lib/validators/attendance';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Silakan login terlebih dahulu.' }, { status: 401 });
	}

	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		return json({ success: false, message: 'Hanya Mentor dan Admin yang dapat membuat token QR presensi.' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const parseResult = generateTokenSchema.safeParse(body);

		if (!parseResult.success) {
			return json(
				{
					success: false,
					message: parseResult.error.issues[0]?.message || 'Input token tidak valid.'
				},
				{ status: 400 }
			);
		}

		const tokenData = await AttendanceService.generateQRToken(
			parseResult.data.pertemuanId,
			parseResult.data.expirySeconds
		);

		return json({
			success: true,
			message: 'Token QR presensi berhasil dibuat.',
			data: tokenData
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				message: err.message || 'Gagal membuat token QR presensi.'
			},
			{ status: 400 }
		);
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Silakan login terlebih dahulu.' }, { status: 401 });
	}

	// [Security] Only mentor and admin can retrieve active QR tokens.
	// Without this guard a siswa could grab any active token and scan attendance
	// for a class they don't belong to, earning illegitimate points (IDOR).
	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		return json(
			{ success: false, message: 'Hanya Mentor dan Admin yang dapat melihat token QR presensi.' },
			{ status: 403 }
		);
	}

	const pertemuanIdParam = url.searchParams.get('pertemuanId');
	if (!pertemuanIdParam || isNaN(Number(pertemuanIdParam))) {
		return json({ success: false, message: 'Query parameter pertemuanId tidak valid.' }, { status: 400 });
	}

	try {
		const pertemuanId = Number(pertemuanIdParam);
		const activeToken = await AttendanceService.getLatestActiveToken(pertemuanId);

		return json({
			success: true,
			data: activeToken
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				message: err.message || 'Gagal mengambil token presensi.'
			},
			{ status: 400 }
		);
	}
};
