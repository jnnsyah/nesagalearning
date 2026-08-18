import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { MentorStudentRosterService } from '$lib/server/services/mentor-student-roster.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const mentorUserId = Number(locals.user.id);
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');
	const searchQuery = url.searchParams.get('q') || '';
	const riskFilter = (url.searchParams.get('risk') as any) || 'all';

	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	const rosterData = await MentorStudentRosterService.getRosterData({
		mentorUserId,
		tahunAjaranId,
		kelasInstanceId,
		searchQuery,
		riskFilter
	});

	return {
		user: locals.user,
		rosterData
	};
};

export const actions: Actions = {
	quickAttendance: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const studentUserId = Number(formData.get('studentUserId'));
		const pertemuanId = Number(formData.get('pertemuanId'));
		const status = formData.get('status') as 'hadir' | 'excused';
		const manualReason = (formData.get('manualReason') as string) || '';

		if (!studentUserId || !pertemuanId || !status) {
			return fail(400, { message: 'Lengkapi semua field presensi manual.' });
		}

		if (!manualReason || manualReason.trim().length < 3) {
			return fail(400, { message: 'Alasan presensi manual wajib diisi (minimal 3 karakter).' });
		}

		try {
			const res = await MentorStudentRosterService.recordQuickAttendance({
				mentorUserId: Number(locals.user.id),
				studentUserId,
				pertemuanId,
				status,
				manualReason
			});

			return {
				success: true,
				message: `Presensi manual berhasil dicatat untuk ${res.attendance ? 'siswa' : ''}.`
			};
		} catch (err: any) {
			return fail(400, { message: err.message || 'Gagal mencatat presensi manual.' });
		}
	}
};
