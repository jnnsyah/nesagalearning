import { redirect, type RequestHandler } from '@sveltejs/kit';
import { logoutUser } from '$lib/server/services/auth.service';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) {
		const blankCookie = await logoutUser(locals.session.id);
		cookies.set(blankCookie.name, blankCookie.value, {
			path: '.',
			...blankCookie.attributes
		});
	}
	throw redirect(302, '/login');
};

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) {
		const blankCookie = await logoutUser(locals.session.id);
		cookies.set(blankCookie.name, blankCookie.value, {
			path: '.',
			...blankCookie.attributes
		});
	}
	throw redirect(302, '/login');
};
