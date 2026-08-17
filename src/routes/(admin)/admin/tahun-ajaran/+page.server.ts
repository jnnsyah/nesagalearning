import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { AcademicAdminService } from '$lib/server/services/academic-admin.service';
import { createTahunAjaranSchema, updateTahunAjaranSchema } from '$lib/validators/academic';
import { formatErrorMessage } from '$lib/server/utils/error-formatter';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	try {
		const query = url.searchParams.get('q') || '';
		const data = await AcademicAdminService.getTahunAjaranList(query);

		return {
			items: data.items,
			stats: data.stats,
			query
		};
	} catch (err: any) {
		console.error('[Admin Tahun Ajaran Load Error]:', err);
		return {
			items: [],
			stats: { totalTahunAjaran: 0, activeTahunAjaranName: null, totalClassesAcrossAll: 0, totalStudentsAcrossAll: 0 },
			query: ''
		};
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const name = formData.get('name') as string;
			const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on';
			const startedAt = (formData.get('startedAt') as string) || '';
			const endedAt = (formData.get('endedAt') as string) || '';

			const parseResult = createTahunAjaranSchema.safeParse({
				name,
				isActive,
				startedAt,
				endedAt
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await AcademicAdminService.createTahunAjaran(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[createTahunAjaran Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal membuat tahun ajaran.')
			});
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const name = formData.get('name') as string;
			const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on';
			const startedAt = (formData.get('startedAt') as string) || '';
			const endedAt = (formData.get('endedAt') as string) || '';

			const parseResult = updateTahunAjaranSchema.safeParse({
				id,
				name,
				isActive,
				startedAt,
				endedAt
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await AcademicAdminService.updateTahunAjaran(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[updateTahunAjaran Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal memperbarui tahun ajaran.')
			});
		}
	},

	setActive: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			if (!id || id <= 0) {
				return fail(400, { success: false, message: 'ID tahun ajaran tidak valid.' });
			}

			const res = await AcademicAdminService.setActiveTahunAjaran(id);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[setActiveTahunAjaran Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal mengubah status aktif tahun ajaran.')
			});
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			if (!id || id <= 0) {
				return fail(400, { success: false, message: 'ID tahun ajaran tidak valid.' });
			}

			const res = await AcademicAdminService.deleteTahunAjaran(id);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[deleteTahunAjaran Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menghapus tahun ajaran.')
			});
		}
	}
};
