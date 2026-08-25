import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema/auth';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ available: false, message: 'Unauthorized' }, { status: 401 });
	}

	const username = url.searchParams.get('username')?.trim().toLowerCase() || '';
	const currentUserId = Number(locals.user.id);

	if (!username || username.length < 3) {
		return json({ available: false, message: 'Username minimal 3 karakter' });
	}

	if (!/^[a-z0-9_]+$/.test(username)) {
		return json({ available: false, message: 'Username hanya boleh huruf kecil, angka, dan underscore (_)' });
	}

	try {
		const [existing] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.username, username));

		if (existing && existing.id !== currentUserId) {
			return json({ available: false, message: 'Username sudah digunakan oleh akun lain' });
		}

		return json({ available: true, message: 'Username tersedia' });
	} catch (err: any) {
		return json({ available: false, message: 'Gagal memeriksa ketersediaan username' }, { status: 500 });
	}
};
