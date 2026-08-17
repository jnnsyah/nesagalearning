import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { MasterAdminService } from '$lib/server/services/master-admin.service';
import { createKelasSchema, updateKelasSchema, bulkPromoteSchema, taBulkPromoteSchema } from '$lib/validators/master';
import { formatErrorMessage } from '$lib/server/utils/error-formatter';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	const q = url.searchParams.get('q') || '';
	const filterTaId = Number(url.searchParams.get('ta')) || 0;
	const filterTingkatId = Number(url.searchParams.get('tingkat')) || 0;

	try {
		const [data, options] = await Promise.all([
			MasterAdminService.getKelasList(q, filterTaId, filterTingkatId),
			MasterAdminService.getOptionsData()
		]);

		return {
			items: data.items,
			stats: data.stats,
			options,
			query: q
		};
	} catch (err: any) {
		console.error('[Admin Master Load Error]:', err);
		return {
			items: [],
			stats: { totalKelas: 0, activeKelasCount: 0, totalStudentsAcrossClasses: 0, totalAssignedMentors: 0 },
			options: { tahunAjaranList: [], tingkatList: [], trackList: [], mentorsList: [], studentsList: [] },
			query: q
		};
	}
};

export const actions: Actions = {
	createKelas: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const name = (formData.get('name') as string) || '';
			const tahunAjaranId = Number(formData.get('tahunAjaranId'));
			const tingkatId = Number(formData.get('tingkatId'));
			const curriculumTrackId = Number(formData.get('curriculumTrackId'));
			const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on';

			const mentorIdsRaw = formData.getAll('mentorIds');
			const mentorIds = mentorIdsRaw.map(Number).filter((id) => !isNaN(id) && id > 0);

			const parseResult = createKelasSchema.safeParse({
				name,
				tahunAjaranId,
				tingkatId,
				curriculumTrackId,
				mentorIds,
				isActive
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input data kelas tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await MasterAdminService.createKelas(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[createKelas Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menyimpan kelas. Pastikan data terisi dengan benar.')
			});
		}
	},

	updateKelas: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const name = (formData.get('name') as string) || '';
			const tahunAjaranId = Number(formData.get('tahunAjaranId'));
			const tingkatId = Number(formData.get('tingkatId'));
			const curriculumTrackId = Number(formData.get('curriculumTrackId'));
			const isActive = formData.get('isActive') === 'true' || formData.get('isActive') === 'on';

			const mentorIdsRaw = formData.getAll('mentorIds');
			const mentorIds = mentorIdsRaw.map(Number).filter((id) => !isNaN(id) && id > 0);

			const parseResult = updateKelasSchema.safeParse({
				id,
				name,
				tahunAjaranId,
				tingkatId,
				curriculumTrackId,
				mentorIds,
				isActive
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input data kelas tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await MasterAdminService.updateKelas(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[updateKelas Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal memperbarui kelas.')
			});
		}
	},

	deleteKelas: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			if (!id || id <= 0) {
				return fail(400, { success: false, message: 'ID kelas tidak valid.' });
			}

			const res = await MasterAdminService.deleteKelas(id);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[deleteKelas Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menghapus kelas.')
			});
		}
	},

	getStudents: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const kelasId = Number(formData.get('kelasId'));

			if (!kelasId || kelasId <= 0) {
				return fail(400, { success: false, message: 'ID kelas tidak valid.' });
			}

			const students = await MasterAdminService.getStudentsInKelas(kelasId);
			return { success: true, students };
		} catch (err: any) {
			console.error('[getStudents Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal mengambil data siswa kelas.')
			});
		}
	},

	bulkPromote: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const sourceKelasId = Number(formData.get('sourceKelasId'));
			const targetKelasId = Number(formData.get('targetKelasId'));
			const promotionsJson = formData.get('promotionsJson') as string;

			if (!promotionsJson) {
				return fail(400, { success: false, message: 'Data kenaikan kelas kosong.' });
			}

			let promotionsRaw: any[] = [];
			try {
				promotionsRaw = JSON.parse(promotionsJson);
			} catch {
				return fail(400, { success: false, message: 'Format data kenaikan kelas tidak valid.' });
			}

			const parseResult = bulkPromoteSchema.safeParse({
				sourceKelasId,
				targetKelasId,
				promotions: promotionsRaw
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input data kenaikan kelas tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await MasterAdminService.bulkPromoteStudents(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[bulkPromote Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal memproses kenaikan kelas.')
			});
		}
	},

	getPromotionMatrix: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const sourceTaId = Number(formData.get('sourceTaId'));
			const targetTaId = Number(formData.get('targetTaId'));

			if (!sourceTaId || !targetTaId || sourceTaId <= 0 || targetTaId <= 0) {
				return fail(400, { success: false, message: 'Tahun ajaran asal & tujuan tidak valid.' });
			}

			const data = await MasterAdminService.getTaPromotionMatrix(sourceTaId, targetTaId);
			return { success: true, matrixData: data };
		} catch (err: any) {
			console.error('[getPromotionMatrix Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal memuat matriks kenaikan kelas.')
			});
		}
	},

	executeTaPromotion: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const sourceTaId = Number(formData.get('sourceTaId'));
			const targetTaId = Number(formData.get('targetTaId'));
			const mappingsJson = formData.get('mappingsJson') as string;

			if (!mappingsJson) {
				return fail(400, { success: false, message: 'Data pemetaan kenaikan kelas kosong.' });
			}

			let mappingsRaw: any[] = [];
			try {
				mappingsRaw = JSON.parse(mappingsJson);
			} catch {
				return fail(400, { success: false, message: 'Format data pemetaan tidak valid.' });
			}

			const parseResult = taBulkPromoteSchema.safeParse({
				sourceTaId,
				targetTaId,
				mappings: mappingsRaw
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input data kenaikan kelas tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await MasterAdminService.executeTaBulkPromotion(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[executeTaPromotion Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal memproses kenaikan kelas.')
			});
		}
	},

	addStudent: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const kelasInstanceId = Number(formData.get('kelasInstanceId'));
			const userId = Number(formData.get('userId'));

			if (!kelasInstanceId || !userId || kelasInstanceId <= 0 || userId <= 0) {
				return fail(400, { success: false, message: 'Siswa dan kelas harus dipilih.' });
			}

			const res = await MasterAdminService.addStudentToKelas(kelasInstanceId, userId);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[addStudent Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menambahkan siswa ke kelas.')
			});
		}
	},

	removeStudent: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const kelasInstanceId = Number(formData.get('kelasInstanceId'));
			const userId = Number(formData.get('userId'));

			if (!kelasInstanceId || !userId || kelasInstanceId <= 0 || userId <= 0) {
				return fail(400, { success: false, message: 'Data kelas atau siswa tidak valid.' });
			}

			const res = await MasterAdminService.removeStudentFromKelas(kelasInstanceId, userId);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[removeStudent Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal mengeluarkan siswa dari kelas.')
			});
		}
	}
};
