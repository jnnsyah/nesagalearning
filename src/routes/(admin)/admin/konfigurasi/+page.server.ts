import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { PointConfigAdminService } from '$lib/server/services/point-config-admin.service';
import { updatePointConfigSchema } from '$lib/validators/point-config';
import { formatErrorMessage } from '$lib/server/utils/error-formatter';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	try {
		const data = await PointConfigAdminService.getPointConfigs();

		return {
			items: data.items,
			stats: data.stats
		};
	} catch (err: any) {
		console.error('[Admin Konfigurasi Load Error]:', err);
		return {
			items: [],
			stats: { totalConfigsCount: 0, weekdayAttendancePoints: 100, weekendAttendancePoints: 150, maxStreakBonus: 1000, maxTaskPoints: 200, lastUpdatedAt: null }
		};
	}
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const configKey = formData.get('configKey') as string;
			const configValue = Number(formData.get('configValue'));
			const description = (formData.get('description') as string) || undefined;

			const parseResult = updatePointConfigSchema.safeParse({
				configKey,
				configValue,
				description
			});

			if (!parseResult.success) {
				const errors = parseResult.error.flatten().fieldErrors;
				const firstError = Object.values(errors)[0]?.[0] || 'Input tidak valid.';
				return fail(400, { success: false, message: firstError, errors });
			}

			const res = await PointConfigAdminService.updatePointConfig(parseResult.data);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[updatePointConfig Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal memperbarui konfigurasi poin.')
			});
		}
	},

	bulkUpdate: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const formData = await request.formData();
			const entries: Array<{ key: string; value: number }> = [];

			for (const [key, val] of formData.entries()) {
				if (key.startsWith('config_')) {
					const configKey = key.replace('config_', '');
					const numValue = Number(val);
					if (!isNaN(numValue) && numValue >= 0) {
						entries.push({ key: configKey, value: numValue });
					}
				}
			}

			if (entries.length === 0) {
				return fail(400, { success: false, message: 'Tidak ada data konfigurasi yang diubah.' });
			}

			const res = await PointConfigAdminService.bulkUpdatePointConfigs(entries);
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[bulkUpdatePointConfig Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal menyimpan perubahan konfigurasi.')
			});
		}
	},

	resetDefaults: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(401, { success: false, message: 'Akses ditolak.' });
		}

		try {
			const res = await PointConfigAdminService.resetToDefaults();
			if (!res.success) {
				return fail(400, { success: false, message: res.message });
			}

			return { success: true, message: res.message };
		} catch (err: any) {
			console.error('[resetDefaults Error]:', err);
			return fail(400, {
				success: false,
				message: formatErrorMessage(err, 'Gagal mengembalikan konfigurasi poin ke default.')
			});
		}
	}
};
