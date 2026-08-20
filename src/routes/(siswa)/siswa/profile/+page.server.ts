import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ProfileService } from '$lib/server/services/profile.service';
import { updateProfileSchema, updatePasswordSchema } from '$lib/validators/profile';

import { uploadFile } from '$lib/server/storage/r2';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userId = Number(locals.user.id);
	const pageParam = Math.max(1, Number(url.searchParams.get('page') || '1'));
	const profileData = await ProfileService.getUserProfileData(userId, pageParam, 10);
	if (!profileData) {
		throw redirect(302, '/login');
	}

	return {
		user: profileData.user,
		stats: profileData.stats,
		pointLogs: profileData.pointLogs,
		availableAvatars: profileData.availableAvatars
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const fullName = formData.get('fullName') as string;
		const email = formData.get('email') as string;
		const nisn = formData.get('nisn') as string;
		let avatarUrl = (formData.get('avatarUrl') as string) || undefined;
		const avatarFile = formData.get('avatarFile') as File | null;

		if (avatarFile && avatarFile.size > 0) {
			const uploadRes = await uploadFile(avatarFile, 'avatars');
			avatarUrl = uploadRes.url;
		}

		const parseResult = updateProfileSchema.safeParse({ fullName, email, nisn });
		if (!parseResult.success) {
			return fail(400, { errors: parseResult.error.flatten().fieldErrors });
		}

		const userId = Number(locals.user.id);
		const res = await ProfileService.updateProfileInfo(userId, { ...parseResult.data, avatarUrl });
		if (!res.success) {
			return fail(400, { message: res.message });
		}

		return { success: true, message: res.message };
	},

	updatePassword: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword') as string;
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		const parseResult = updatePasswordSchema.safeParse({
			currentPassword,
			newPassword,
			confirmPassword
		});

		if (!parseResult.success) {
			return fail(400, { errors: parseResult.error.flatten().fieldErrors });
		}

		const userId = Number(locals.user.id);
		const res = await ProfileService.updatePassword(userId, parseResult.data);
		if (!res.success) {
			return fail(400, { message: res.message });
		}

		return { success: true, message: res.message };
	}
};
