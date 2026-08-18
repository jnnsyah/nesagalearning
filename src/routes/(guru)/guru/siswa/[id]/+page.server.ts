import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { AdvisorDetailService } from '$lib/server/services/advisor-detail.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const studentId = parseInt(params.id, 10);
	if (isNaN(studentId)) {
		throw error(400, 'ID Siswa tidak valid');
	}

	const detailData = await AdvisorDetailService.getStudentDetail(studentId);
	if (!detailData) {
		throw error(404, 'Data siswa tidak ditemukan');
	}

	return {
		detailData
	};
};

export const actions: Actions = {
	addNote: async ({ request, params, locals }) => {
		const studentId = parseInt(params.id, 10);
		if (isNaN(studentId)) {
			return fail(400, { error: 'ID Siswa tidak valid' });
		}

		const formData = await request.formData();
		const noteText = (formData.get('note') as string)?.trim();
		const category = (formData.get('category') as string)?.trim() || 'intervensi';

		if (!noteText) {
			return fail(400, { error: 'Catatan intervensi tidak boleh kosong' });
		}

		const advisorId = Number(locals.user?.id) || 1;

		try {
			await AdvisorDetailService.addAdvisorNote({
				studentId,
				advisorId,
				note: noteText,
				category
			});

			return {
				success: true,
				message: 'Catatan pendampingan berhasil disimpan'
			};
		} catch (err: any) {
			console.error('Failed to add advisor note:', err);
			return fail(500, { error: 'Gagal menyimpan catatan intervensi' });
		}
	}
};
