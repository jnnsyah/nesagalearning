import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ClassHealthService } from '$lib/server/services/class-health.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	if (locals.user.role !== 'guru' && locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	const kelasIdParam = url.searchParams.get('kelasId');
	const searchParam = url.searchParams.get('search') || '';
	const riskLevelParam = url.searchParams.get('risk') || 'semua';

	const parsedKelasId = kelasIdParam ? Number(kelasIdParam) : undefined;

	const { classOptions, selectedKelas, summary, alertStudentsCount } =
		await ClassHealthService.getClassHealthSummary(parsedKelasId);

	const roster = await ClassHealthService.getStudentHealthRoster({
		kelasId: summary.kelasId,
		search: searchParam,
		riskLevel: riskLevelParam
	});

	return {
		user: locals.user,
		classOptions,
		selectedKelas,
		summary,
		alertStudentsCount,
		roster,
		filters: {
			kelasId: summary.kelasId,
			search: searchParam,
			riskLevel: riskLevelParam
		}
	};
};
