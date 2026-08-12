import { lucia } from '$lib/server/auth/lucia';
import { redirect, type Handle } from '@sveltejs/kit';

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
	const normalizedPath = path.toLowerCase();
	const user = event.locals.user;

	// Public routes
	const isLoginRoute = normalizedPath === '/login';
	const isLogoutRoute = normalizedPath === '/logout';
	const isApiRoute = normalizedPath.startsWith('/api/');

	// Root path handling
	if (normalizedPath === '/' || normalizedPath === '') {
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

	// Strict Role-Based Access Control & Anti-URL Traversal
	const role = user.role;

	const isAdminRoute = normalizedPath.startsWith('/admin') || normalizedPath.startsWith('/api/admin');
	const isMentorRoute = normalizedPath.startsWith('/mentor') || normalizedPath.startsWith('/api/mentor');
	const isGuruRoute = normalizedPath.startsWith('/guru') || normalizedPath.startsWith('/api/guru');
	const isSiswaRoute = normalizedPath.startsWith('/siswa') || normalizedPath.startsWith('/api/siswa');

	let isAllowed = true;

	if (isAdminRoute && role !== 'admin') {
		isAllowed = false;
	} else if (isMentorRoute && role !== 'mentor' && role !== 'admin') {
		isAllowed = false;
	} else if (isGuruRoute && role !== 'guru' && role !== 'admin') {
		isAllowed = false;
	} else if (isSiswaRoute && role !== 'siswa' && role !== 'admin') {
		isAllowed = false;
	}

	if (!isAllowed) {
		if (isApiRoute) {
			return new Response(
				JSON.stringify({ error: 'Forbidden: Akses ditolak untuk role Anda' }),
				{
					status: 403,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
		// Redirect user back to their assigned role dashboard to block URL role traversal
		throw redirect(302, getRoleDefaultRoute(role));
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
