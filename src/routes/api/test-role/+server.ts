import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	return json({
		message: 'Protected API endpoint accessed successfully',
		user: locals.user
	});
};
