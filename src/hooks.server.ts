import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// RBAC and session checks will be enforced here in Phase 2
	return resolve(event);
};
