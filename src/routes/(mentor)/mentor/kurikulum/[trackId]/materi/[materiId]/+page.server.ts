import { fail, redirect, error, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CurriculumService } from '$lib/server/services/curriculum.service';
import { updateMateriSchema } from '$lib/validators/curriculum';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'mentor') {
		throw redirect(302, '/login');
	}

	const materiId = Number(params.materiId);
	if (isNaN(materiId)) {
		throw error(400, 'ID Materi tidak valid');
	}

	try {
		const materi = await CurriculumService.getMateriWithDetails(materiId);
		if (!materi) {
			throw error(404, 'Modul Materi tidak ditemukan');
		}

		return {
			materi,
			trackId: params.trackId
		};
	} catch (err: any) {
		console.error('Error loading materi in Modul Builder:', err);
		if (err?.status) throw err;
		throw error(500, err?.message || 'Gagal memuat modul materi');
	}
};

export const actions: Actions = {
	updateMateri: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const materiId = Number(params.materiId);
		const formData = await request.formData();
		const title = formData.get('title')?.toString() || '';
		const content = formData.get('content')?.toString() || '';
		const rawAttachments = formData.get('attachments')?.toString();
		let attachments = undefined;
		if (rawAttachments) {
			try {
				attachments = JSON.parse(rawAttachments);
			} catch {}
		}

		const parse = updateMateriSchema.safeParse({ title, content, attachments });
		if (!parse.success) {
			console.error('updateMateri validation error:', parse.error.format());
			return fail(400, { error: parse.error.issues[0]?.message || 'Input materi tidak valid' });
		}

		try {
			await CurriculumService.updateMateri(materiId, parse.data);
			return { success: true, message: 'Modul Materi berhasil disimpan' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menyimpan modul materi' });
		}
	}
};
