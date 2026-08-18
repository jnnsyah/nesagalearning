import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CurriculumService } from '$lib/server/services/curriculum.service';
import { createCurriculumTrackSchema, updateCurriculumTrackSchema } from '$lib/validators/curriculum';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'mentor') {
		throw redirect(302, '/login');
	}

	const [tracks, tingkatList] = await Promise.all([
		CurriculumService.getTracks(),
		CurriculumService.getTingkatList()
	]);

	return {
		tracks,
		tingkatList
	};
};

export const actions: Actions = {
	createTrack: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const formData = await request.formData();
		const tingkatId = Number(formData.get('tingkatId'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';

		const parse = createCurriculumTrackSchema.safeParse({ tingkatId, title, description });
		if (!parse.success) {
			const errors = parse.error.flatten().fieldErrors;
			return fail(400, { error: 'Input tidak valid', fieldErrors: errors });
		}

		try {
			await CurriculumService.createTrack(parse.data);
			return { success: true, message: 'Track Pembelajaran berhasil dibuat' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal membuat track pembelajaran' });
		}
	},

	updateTrack: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const tingkatId = Number(formData.get('tingkatId'));
		const title = formData.get('title')?.toString() || '';
		const description = formData.get('description')?.toString() || '';
		const isPublished = formData.get('isPublished') === 'true';

		const parse = updateCurriculumTrackSchema.safeParse({ tingkatId, title, description, isPublished });
		if (!parse.success) {
			return fail(400, { error: 'Input tidak valid' });
		}

		try {
			await CurriculumService.updateTrack(id, parse.data);
			return { success: true, message: 'Track Pembelajaran berhasil diperbarui' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal memperbarui track' });
		}
	},

	togglePublish: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const isPublished = formData.get('isPublished') === 'true';

		try {
			await CurriculumService.togglePublishTrack(id, !isPublished);
			return { success: true, message: `Status publikasi berhasil diubah` };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal mengubah status' });
		}
	},

	deleteTrack: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'mentor') {
			return fail(403, { error: 'Akses ditolak' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));

		try {
			await CurriculumService.deleteTrack(id);
			return { success: true, message: 'Track Pembelajaran berhasil dihapus' };
		} catch (err: any) {
			return fail(500, { error: err?.message || 'Gagal menghapus track' });
		}
	}
};
