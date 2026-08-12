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

	return resolve(event);
};
