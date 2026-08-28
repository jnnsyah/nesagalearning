import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	const username = url.searchParams.get('username')?.trim().toLowerCase() || '';
	const currentUserId = locals.user ? Number(locals.user.id) : null;

	if (!username || username.length < 3) {
		return json({ available: false, message: 'Username minimal 3 karakter' });
	}

	if (username.length > 20) {
		return json({ available: false, message: 'Username maksimal 20 karakter' });
	}

	if (!/^[a-z0-9_]+$/.test(username)) {
		return json({ available: false, message: 'Username hanya boleh huruf kecil, angka, dan underscore (_)' });
	}

	try {
		const [existingUser] = await db
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.username, username));

		if (existingUser && existingUser.id !== currentUserId) {
			return json({ available: false, message: 'Username sudah digunakan oleh akun lain' });
		}

		return json({ available: true, message: 'Username tersedia!' });
	} catch (err: any) {
		return json({ available: false, message: 'Gagal memeriksa ketersediaan username' }, { status: 500 });
	}
};
