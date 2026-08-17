import { json, type RequestHandler } from '@sveltejs/kit';
import { AttendanceService } from '$lib/server/services/attendance.service';
import { bulkManualAttendanceSchema } from '$lib/validators/attendance';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Silakan login terlebih dahulu.' }, { status: 401 });
	}

	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		return json({ success: false, message: 'Hanya Mentor dan Admin yang dapat menyimpan presensi manual.' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const parseResult = bulkManualAttendanceSchema.safeParse(body);

		if (!parseResult.success) {
			return json(
				{
					success: false,
					message: parseResult.error.issues[0]?.message || 'Input presensi massal tidak valid.'
				},
				{ status: 400 }
			);
		}

		const result = await AttendanceService.recordAttendanceBulk({
			pertemuanId: parseResult.data.pertemuanId,
			defaultReason: parseResult.data.defaultReason,
			items: parseResult.data.items
		});

		return json({
			success: true,
			message: result.message,
			updatedCount: result.updatedCount
		});
	} catch (err: any) {
		return json(
			{
				success: false,
				message: err.message || 'Gagal menyimpan presensi massal.'
			},
			{ status: 400 }
		);
	}
};
