import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { MasterAdminService } from '$lib/server/services/master-admin.service';
import { bulkAssignStudentsSchema, bulkRemoveStudentsSchema } from '$lib/validators/master';

function formatErrorMessage(err: any, fallback: string): string {
	if (err?.message && typeof err.message === 'string') {
		return err.message;
	}
	return fallback;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(401, 'Akses ditolak.');
	}

	const kelasId = Number(params.id);
	if (!kelasId || isNaN(kelasId)) {
		throw error(404, 'Kelas tidak ditemukan.');
	}

	const detail = await MasterAdminService.getKelasDetail(kelasId);
	if (!detail.kelas) {
		throw error(404, 'Kelas tidak ditemukan.');
	}

	return {
		kelas: detail.kelas,
		members: detail.members,
		availableStudents: detail.availableStudents
	};
};

export const actions: Actions = {
	bulkAddMembers: async ({ params, request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		const kelasId = Number(params.id);
		if (!kelasId) {
			return fail(400, { success: false, message: 'ID Kelas tidak valid.' });
		}

		try {
			const formData = await request.formData();
			const userIdsJson = formData.get('userIdsJson') as string;

			if (!userIdsJson) {
				return fail(400, { success: false, message: 'Pilih minimal 1 siswa untuk ditambahkan.' });
			}

			let userIds: number[] = [];
			try {
				userIds = JSON.parse(userIdsJson);
			} catch {
				return fail(400, { success: false, message: 'Format data siswa tidak valid.' });
			}

			const parseResult = bulkAssignStudentsSchema.safeParse({
				userIds,
				targetKelasId: kelasId
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await MasterAdminService.bulkAssignStudents(
				parseResult.data.userIds,
				parseResult.data.targetKelasId
			);

			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[bulkAddMembers Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menambahkan siswa ke kelas.')
			});
		}
	},

	bulkRemoveMembers: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const userIdsJson = formData.get('userIdsJson') as string;

			if (!userIdsJson) {
				return fail(400, { success: false, message: 'Pilih minimal 1 siswa untuk dikeluarkan.' });
			}

			let userIds: number[] = [];
			try {
				userIds = JSON.parse(userIdsJson);
			} catch {
				return fail(400, { success: false, message: 'Format data siswa tidak valid.' });
			}

			const parseResult = bulkRemoveStudentsSchema.safeParse({ userIds });

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await MasterAdminService.bulkRemoveStudents(parseResult.data.userIds);

			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[bulkRemoveMembers Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal mengeluarkan siswa dari kelas.')
			});
		}
	}
};
