import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { OperationalMasterAdminService } from '$lib/server/services/operational-master-admin.service';
import { MasterAdminService } from '$lib/server/services/master-admin.service';
import { formatErrorMessage } from '$lib/server/utils/error-formatter';
import { uploadFile } from '$lib/server/storage/r2';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	try {
		const [operationalData, angkatanList, rombelList] = await Promise.all([
			OperationalMasterAdminService.getOperationalMasterData(),
			MasterAdminService.getAllAngkatan(),
			MasterAdminService.getAllRombel()
		]);

		return {
			rooms: operationalData.rooms,
			avatars: operationalData.avatars,
			badges: operationalData.badges,
			activityTypes: operationalData.activityTypes,
			stats: operationalData.stats,
			angkatanList,
			rombelList
		};
	} catch (err: any) {
		console.error('[Admin Master Load Error]:', err);
		return {
			rooms: [],
			avatars: [],
			badges: [],
			activityTypes: [],
			stats: { totalRooms: 0, totalAvatars: 0, totalBadges: 0, totalActivityTypes: 0 },
			angkatanList: [],
			rombelList: []
		};
	}
};

export const actions: Actions = {
	createRoom: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const name = (formData.get('name') as string) || '';
			const description = (formData.get('description') as string) || undefined;

			if (!name.trim()) {
				return fail(400, { success: false, message: 'Nama ruangan tidak boleh kosong.' });
			}

			const res = await OperationalMasterAdminService.createRoom({ name, description });
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[createRoom Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menambahkan ruangan.')
			});
		}
	},

	updateRoom: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const name = (formData.get('name') as string) || '';
			const description = (formData.get('description') as string) || undefined;

			if (!id || !name.trim()) {
				return fail(400, { success: false, message: 'ID dan Nama ruangan harus diisi.' });
			}

			const res = await OperationalMasterAdminService.updateRoom(id, { name, description });
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal memperbarui ruangan.') });
		}
	},

	deleteRoom: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			if (!id) {
				return fail(400, { success: false, message: 'ID ruangan tidak valid.' });
			}

			const res = await OperationalMasterAdminService.deleteRoom(id);
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menghapus ruangan.') });
		}
	},

	createActivityType: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const code = (formData.get('code') as string) || '';
			const name = (formData.get('name') as string) || '';
			const description = (formData.get('description') as string) || undefined;

			if (!code.trim() || !name.trim()) {
				return fail(400, { success: false, message: 'Kode dan Nama Tipe Aktivitas harus diisi.' });
			}

			const res = await OperationalMasterAdminService.createActivityType({ code, name, description });
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menambahkan tipe aktivitas.') });
		}
	},

	updateActivityType: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const code = (formData.get('code') as string) || '';
			const name = (formData.get('name') as string) || '';
			const description = (formData.get('description') as string) || undefined;

			if (!id || !code.trim() || !name.trim()) {
				return fail(400, { success: false, message: 'ID, Kode, dan Nama Tipe Aktivitas harus diisi.' });
			}

			const res = await OperationalMasterAdminService.updateActivityType(id, { code, name, description });
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal memperbarui tipe aktivitas.') });
		}
	},

	deleteActivityType: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			const res = await OperationalMasterAdminService.deleteActivityType(id);
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menghapus tipe aktivitas.') });
		}
	},

	createAvatar: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const name = (formData.get('name') as string) || '';
			let imageUrl = (formData.get('imageUrl') as string) || '';
			const avatarFile = formData.get('avatarFile') as File | null;

			if (!name.trim()) {
				return fail(400, { success: false, message: 'Nama avatar tidak boleh kosong.' });
			}

			if (avatarFile && avatarFile.size > 0) {
				const uploadRes = await uploadFile(avatarFile, 'avatars');
				imageUrl = uploadRes.url;
			}

			if (!imageUrl.trim()) {
				return fail(400, { success: false, message: 'Pilih berkas gambar avatar atau masukkan URL gambar avatar.' });
			}

			const res = await OperationalMasterAdminService.createAvatar({ name, imageUrl: imageUrl.trim() });
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menambahkan avatar.') });
		}
	},

	deleteAvatar: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			const res = await OperationalMasterAdminService.deleteAvatar(id);
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menghapus avatar.') });
		}
	},

	createBadgeType: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const name = (formData.get('name') as string) || '';
			const description = (formData.get('description') as string) || undefined;
			const criteria = (formData.get('criteria') as string) || undefined;
			const iconUrl = (formData.get('iconUrl') as string) || undefined;
			const triggerType = (formData.get('triggerType') as string) || 'manual_award';
			const triggerThreshold = Number(formData.get('triggerThreshold') || 0);

			if (!name.trim()) {
				return fail(400, { success: false, message: 'Nama badge tidak boleh kosong.' });
			}

			const res = await OperationalMasterAdminService.createBadgeType({ name, description, criteria, iconUrl, triggerType, triggerThreshold });
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menambahkan badge.') });
		}
	},

	deleteBadgeType: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));

			const res = await OperationalMasterAdminService.deleteBadgeType(id);
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menghapus badge.') });
		}
	},

	updateBadgeType: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const name = (formData.get('name') as string) || '';
			const description = (formData.get('description') as string) || undefined;
			const criteria = (formData.get('criteria') as string) || undefined;
			const iconUrl = (formData.get('iconUrl') as string) || undefined;
			const triggerType = (formData.get('triggerType') as string) || 'manual_award';
			const triggerThreshold = Number(formData.get('triggerThreshold') || 0);

			if (!id || !name.trim()) {
				return fail(400, { success: false, message: 'ID dan Nama badge harus diisi.' });
			}

			const res = await OperationalMasterAdminService.updateBadgeType(id, { name, description, criteria, iconUrl, triggerType, triggerThreshold });
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal memperbarui badge.') });
		}
	},

	createAngkatan: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}
		try {
			const formData = await request.formData();
			const year = Number(formData.get('year'));
			const name = (formData.get('name') as string) || `Angkatan ${year}`;
			if (!year || isNaN(year)) {
				return fail(400, { success: false, message: 'Tahun angkatan harus diisi (contoh: 2025).' });
			}
			await MasterAdminService.createAngkatan(year, name.trim());
			return { success: true, message: `Angkatan ${year} berhasil ditambahkan.` };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menambahkan angkatan.') });
		}
	},

	toggleAngkatan: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}
		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const isActive = formData.get('isActive') === 'true';
			await MasterAdminService.toggleAngkatan(id, isActive);
			return { success: true, message: 'Status angkatan berhasil diperbarui.' };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menginstal status angkatan.') });
		}
	},

	deleteAngkatan: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}
		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const res = await MasterAdminService.deleteAngkatan(id);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}
			return { success: true, message: res.message };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menghapus angkatan.') });
		}
	},

	createRombel: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}
		try {
			const formData = await request.formData();
			const name = (formData.get('name') as string) || '';
			const levelOrder = Number(formData.get('levelOrder') || 1);
			const nextRombelIdRaw = formData.get('nextRombelId');
			const nextRombelId = nextRombelIdRaw ? Number(nextRombelIdRaw) : null;
			if (!name.trim()) {
				return fail(400, { success: false, message: 'Nama rombel tidak boleh kosong.' });
			}
			await MasterAdminService.createRombel(name.trim(), levelOrder, nextRombelId);
			return { success: true, message: `Master Rombel '${name}' berhasil ditambahkan.` };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menambahkan master rombel.') });
		}
	},

	updateRombel: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}
		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			const name = (formData.get('name') as string) || '';
			const levelOrder = Number(formData.get('levelOrder') || 1);
			const nextRombelIdRaw = formData.get('nextRombelId');
			const nextRombelId = nextRombelIdRaw ? Number(nextRombelIdRaw) : null;
			if (!id || !name.trim()) {
				return fail(400, { success: false, message: 'ID dan Nama rombel tidak boleh kosong.' });
			}
			await MasterAdminService.updateRombel(id, name.trim(), levelOrder, nextRombelId);
			return { success: true, message: `Master Rombel '${name}' berhasil diperbarui.` };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal memperbarui master rombel.') });
		}
	},

	deleteRombel: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}
		try {
			const formData = await request.formData();
			const id = Number(formData.get('id'));
			await MasterAdminService.deleteRombel(id);
			return { success: true, message: 'Master Rombel berhasil dihapus.' };
		} catch (err: any) {
			return fail(400, { success: false, message: formatErrorMessage(err, 'Gagal menghapus master rombel.') });
		}
	}
};
