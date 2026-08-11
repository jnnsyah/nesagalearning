import { lucia } from '$lib/server/auth/lucia';
import { redirect, error, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const { session, user } = await lucia.validateSession(sessionId);
		if (session && session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		}
		if (!session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		}
		event.locals.user = user;
		event.locals.session = session;
	}

	const path = event.url.pathname;
	const user = event.locals.user;

	// Public routes
	const isLoginRoute = path === '/login';
	const isLogoutRoute = path === '/logout';
	const isApiRoute = path.startsWith('/api/');

	// Root path handling
	if (path === '/') {
		if (!user) {
			throw redirect(302, '/login');
		}
		throw redirect(302, getRoleDefaultRoute(user.role));
	}

	// Logged-in user trying to access /login
	if (isLoginRoute && user) {
		throw redirect(302, getRoleDefaultRoute(user.role));
	}

	// Allow unauthenticated access to /login and /logout
	if (isLoginRoute || isLogoutRoute) {
		return resolve(event);
	}

	// Protected routes require authentication
	if (!user) {
		if (isApiRoute) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(302, '/login');
	}

	// Server-side RBAC enforcement
	if (path.startsWith('/admin') && user.role !== 'admin') {
		return handleRbacViolation(isApiRoute, 'Membutuhkan role Admin');
	}

	if (path.startsWith('/mentor') && user.role !== 'mentor' && user.role !== 'admin') {
		return handleRbacViolation(isApiRoute, 'Membutuhkan role Mentor');
	}

	if (path.startsWith('/guru') && user.role !== 'guru' && user.role !== 'admin') {
		return handleRbacViolation(isApiRoute, 'Membutuhkan role Guru');
	}

	if (path.startsWith('/siswa') && user.role !== 'siswa' && user.role !== 'admin') {
		return handleRbacViolation(isApiRoute, 'Membutuhkan role Siswa');
	}

	return resolve(event);
};

function getRoleDefaultRoute(role: string): string {
	switch (role) {
		case 'admin':
			return '/admin';
		case 'guru':
			return '/guru';
		case 'mentor':
			return '/mentor';
		case 'siswa':
		default:
			return '/siswa';
	}
}

function handleRbacViolation(isApiRoute: boolean, message: string): Response {
	if (isApiRoute) {
		return new Response(JSON.stringify({ error: `Forbidden: ${message}` }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	throw error(403, `Akses Ditolak: ${message}`);
}
