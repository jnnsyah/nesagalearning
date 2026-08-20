import { AuthGatekeeper } from '$lib/server/auth/gatekeeper';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Validate session & populate event.locals.user and event.locals.session
	const { user } = await AuthGatekeeper.validateRequest(event);

	const pathname = event.url.pathname.toLowerCase();

	// Root path redirect
	if (pathname === '/' || pathname === '') {
		if (!user) {
			throw redirect(302, '/login');
		}
		throw redirect(302, `/${user.role}`);
	}

	// Prevent logged-in user from visiting /login
	if (pathname === '/login' && user) {
		throw redirect(302, `/${user.role}`);
	}

	// 2. Enforce Server RBAC Policy via AuthGatekeeper
	AuthGatekeeper.enforceRoutePolicy(user, pathname);

	const response = await resolve(event);

	// 3. Inject Security Hardening Headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
