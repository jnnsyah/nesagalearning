import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Pass user to public layout (may be null for guests)
	return {
		user: locals.user ?? null
	};
};
