import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { UserAdminService } from '$lib/server/services/user-admin.service';
import { AuditLogService } from '$lib/server/services/audit-log.service';
import { db } from '$lib/server/db';
import { masterAngkatan, masterRombel } from '$lib/server/db/schema/academic';
import { desc } from 'drizzle-orm';
import {
	createUserSchema,
	updateUserSchema,
	resetPasswordSchema,
	bulkImportSiswaSchema
} from '$lib/validators/user';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'admin') {
		throw error(403, 'Akses ditolak: Halaman ini khusus untuk Administrator.');
	}

	const search = url.searchParams.get('search') || '';
	const role = url.searchParams.get('role') || 'all';
	const status = (url.searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all';
	const page = Number(url.searchParams.get('page')) || 1;
	try {
		const usersResult = await UserAdminService.getUsersList({
			limit: 500
		});

		const angkatanList = await db
			.select({ id: masterAngkatan.id, year: masterAngkatan.year, name: masterAngkatan.name })
			.from(masterAngkatan)
			.orderBy(desc(masterAngkatan.year));

		const rombelList = await db
			.select({ id: masterRombel.id, name: masterRombel.name })
			.from(masterRombel)
			.orderBy(masterRombel.levelOrder, masterRombel.name);

		return {
			user: locals.user,
			usersResult,
			options: {
				angkatanList,
				rombelList
			}
		};
	} catch (err: any) {
		console.error('Error loading admin users list:', err);
		throw error(500, 'Gagal memuat data user.');
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const username = String(formData.get('username') || '');
		const nisn = String(formData.get('nisn') || '');
		const fullName = String(formData.get('fullName') || '');
		const email = String(formData.get('email') || '');
		const role = String(formData.get('role') || 'siswa');
		const password = String(formData.get('password') || '');
		const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
		const angkatanRaw = formData.get('angkatan');
		const angkatan = angkatanRaw ? Number(angkatanRaw) : null;
		const rombelLabel = String(formData.get('rombelLabel') || '');

		const parseResult = createUserSchema.safeParse({
			username,
			nisn: nisn ? nisn : null,
			fullName,
			email,
			role,
			password,
			isActive
		});

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0]?.message || 'Input data user tidak valid.';
			return fail(400, { message: firstError });
		}

		try {
			await UserAdminService.createUser({
				...parseResult.data,
				angkatan,
				rombelLabel: rombelLabel || null
			});
			return {
				success: true,
				message: `User '${parseResult.data.username}' berhasil ditambahkan!`
			};
		} catch (err: any) {
			console.error('Failed to create user:', err);
			return fail(400, { message: err.message || 'Gagal menambahkan user.' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const username = String(formData.get('username') || '');
		const nisn = String(formData.get('nisn') || '');
		const fullName = String(formData.get('fullName') || '');
		const email = String(formData.get('email') || '');
		const role = String(formData.get('role') || 'siswa');
		const password = String(formData.get('password') || '');
		const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';
		const angkatanRaw = formData.get('angkatan');
		const angkatan = angkatanRaw ? Number(angkatanRaw) : null;
		const rombelLabel = String(formData.get('rombelLabel') || '');

		const parseResult = updateUserSchema.safeParse({
			id,
			username,
			nisn: nisn ? nisn : null,
			fullName,
			email,
			role,
			password: password ? password : null,
			isActive
		});

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0]?.message || 'Input edit user tidak valid.';
			return fail(400, { message: firstError });
		}

		try {
			await UserAdminService.updateUser({
				...parseResult.data,
				angkatan,
				rombelLabel: rombelLabel || null
			});
			return {
				success: true,
				message: `Data user '${parseResult.data.username}' berhasil diperbarui!`
			};
		} catch (err: any) {
			console.error('Failed to update user:', err);
			return fail(400, { message: err.message || 'Gagal memperbarui user.' });
		}
	},

	resetPassword: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const userId = Number(formData.get('userId'));
		const newPassword = String(formData.get('newPassword') || '');

		const parseResult = resetPasswordSchema.safeParse({ userId, newPassword });

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0]?.message || 'Input reset password tidak valid.';
			return fail(400, { message: firstError });
		}

		try {
			await UserAdminService.resetPassword(
				parseResult.data.userId,
				parseResult.data.newPassword
			);
			await AuditLogService.logAction({
				actorId: Number(locals.user.id),
				action: 'RESET_PASSWORD',
				entityType: 'user',
				entityId: parseResult.data.userId,
				newValues: { resetBy: locals.user.username }
			});
			return {
				success: true,
				message: 'Password user berhasil diperbarui!'
			};
		} catch (err: any) {
			console.error('Failed to reset password:', err);
			return fail(400, { message: err.message || 'Gagal mereset password.' });
		}
	},

	toggleStatus: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const userId = Number(formData.get('userId'));

		if (!userId || isNaN(userId)) {
			return fail(400, { message: 'ID user tidak valid.' });
		}

		try {
			const updated = await UserAdminService.toggleUserStatus(userId);
			return {
				success: true,
				message: `Status user '${updated.username}' diubah menjadi ${updated.isActive ? 'Aktif' : 'Nonaktif'}.`
			};
		} catch (err: any) {
			console.error('Failed to toggle status:', err);
			return fail(400, { message: err.message || 'Gagal mengubah status user.' });
		}
	},

	bulkImport: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { message: 'Akses ditolak.' });
		}

		const formData = await request.formData();
		const rawUsersJson = String(formData.get('usersJson') || '[]');
		const defaultPassword = String(formData.get('defaultPassword') || 'NesagaSiswa2026!');

		let usersArray: any[] = [];
		try {
			usersArray = JSON.parse(rawUsersJson);
		} catch (e) {
			return fail(400, { message: 'Format JSON data impor siswa tidak valid.' });
		}

		const parseResult = bulkImportSiswaSchema.safeParse({ users: usersArray });

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0]?.message || 'Data impor siswa tidak valid.';
			return fail(400, { message: firstError });
		}

		try {
			const result = await UserAdminService.bulkImportSiswa(
				parseResult.data.users,
				defaultPassword
			);

			return {
				success: true,
				message: `Impor berhasil: ${result.successCount} siswa dibuat, ${result.skippedCount} dilewati.`
			};
		} catch (err: any) {
			console.error('Failed bulk import siswa:', err);
			return fail(400, { message: err.message || 'Gagal mengimpor data siswa.' });
		}
	}
};
