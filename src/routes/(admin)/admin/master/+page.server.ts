import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { OperationalMasterAdminService } from '$lib/server/services/operational-master-admin.service';
import { formatErrorMessage } from '$lib/server/utils/error-formatter';
import { uploadFile } from '$lib/server/storage/r2';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	try {
		const data = await OperationalMasterAdminService.getOperationalMasterData();

		return {
			rooms: data.rooms,
			avatars: data.avatars,
			badges: data.badges,
			activityTypes: data.activityTypes,
			stats: data.stats
		};
	} catch (err: any) {
		console.error('[Admin Master Operasional Load Error]:', err);
		return {
			rooms: [],
			avatars: [],
			badges: [],
			activityTypes: [],
			stats: { totalRooms: 0, totalAvatars: 0, totalBadges: 0, totalActivityTypes: 0 }
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
	}
};
