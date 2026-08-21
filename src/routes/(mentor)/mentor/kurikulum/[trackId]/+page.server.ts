import { fail, redirect, error, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CurriculumService } from '$lib/server/services/curriculum.service';
import {
	createPhaseSchema,
	updatePhaseSchema,
	createSubPhaseSchema,
	updateSubPhaseSchema,
	createMateriSchema,
	updateCurriculumTrackSchema
} from '$lib/validators/curriculum';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'mentor') {
		throw redirect(302, '/login');
	}

	const trackId = Number(params.trackId);
	if (isNaN(trackId)) {
		throw error(400, 'ID Track tidak valid');
	}

	const [track, tingkatList] = await Promise.all([
		CurriculumService.getTrackWithDetails(trackId),
		CurriculumService.getTingkatList()
	]);

	if (!track) {
		throw error(404, 'Track Pembelajaran tidak ditemukan');
	}

	return {
		track,
		tingkatList
	};
};

export const actions: Actions = {
	updateTrack: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}
		const trackId = Number(params.trackId);
		const formData = await request.formData();
		const tingkatId = Number(formData.get('tingkatId'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';
		const isPublished = formData.get('isPublished') === 'true';

		const parse = updateCurriculumTrackSchema.safeParse({ tingkatId, title, description, isPublished });
		if (!parse.success) return fail(400, { error: 'Input track tidak valid' });

		try {
			await CurriculumService.updateTrack(trackId, parse.data);
			return { success: true, message: 'Track berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal mengupdate track' });
		}
	},

	// --- PHASE ACTIONS ---
	createPhase: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const curriculumTrackId = Number(params.trackId);
		const formData = await request.formData();
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = createPhaseSchema.safeParse({ curriculumTrackId, title, description });
		if (!parse.success) return fail(400, { error: 'Input fase tidak valid' });

		try {
			await CurriculumService.createPhase(parse.data);
			return { success: true, message: 'Fase baru berhasil ditambahkan' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat fase' });
		}
	},

	updatePhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = updatePhaseSchema.safeParse({ title, description });
		if (!parse.success) return fail(400, { error: 'Input fase tidak valid' });

		try {
			await CurriculumService.updatePhase(id, parse.data);
			return { success: true, message: 'Fase berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui fase' });
		}
	},

	deletePhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deletePhase(id);
			return { success: true, message: 'Fase berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus fase' });
		}
	},

	// --- SUBPHASE ACTIONS ---
	createSubPhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const phaseId = Number(formData.get('phaseId'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = createSubPhaseSchema.safeParse({ phaseId, title, description });
		if (!parse.success) return fail(400, { error: 'Input sub-fase tidak valid' });

		try {
			await CurriculumService.createSubPhase(parse.data);
			return { success: true, message: 'Sub-fase berhasil ditambahkan' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat sub-fase' });
		}
	},

	updateSubPhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = updateSubPhaseSchema.safeParse({ title, description });
		if (!parse.success) return fail(400, { error: 'Input sub-fase tidak valid' });

		try {
			await CurriculumService.updateSubPhase(id, parse.data);
			return { success: true, message: 'Sub-fase berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui sub-fase' });
		}
	},

	deleteSubPhase: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deleteSubPhase(id);
			return { success: true, message: 'Sub-fase berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus sub-fase' });
		}
	},

	// --- MATERI ACTIONS ---
	createMateri: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const subPhaseId = Number(formData.get('subPhaseId'));
		const title = formData.get('title')?.toString() || '';

		const parse = createMateriSchema.safeParse({ subPhaseId, title });
		if (!parse.success) return fail(400, { error: 'Input materi tidak valid' });

		try {
			const m = await CurriculumService.createMateri(parse.data);
			return { success: true, message: 'Materi berhasil dibuat', newMateriId: m.id };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat materi' });
		}
	},

	deleteMateri: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') return fail(403, { error: 'Akses ditolak' });
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deleteMateri(id);
			return { success: true, message: 'Materi berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus materi' });
		}
	}
};
