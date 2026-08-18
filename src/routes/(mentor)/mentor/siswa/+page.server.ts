import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { MentorStudentRosterService } from '$lib/server/services/mentor-student-roster.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const mentorUserId = Number(locals.user.id);
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');
	const searchQuery = url.searchParams.get('q') || '';
	const riskFilter = (url.searchParams.get('risk') as any) || 'all';

	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	const rosterData = await MentorStudentRosterService.getRosterData({
		mentorUserId,
		tahunAjaranId,
		kelasInstanceId,
		searchQuery,
		riskFilter
	});

	return {
		user: locals.user,
		rosterData
	};
};
