import type { PageServerLoad } from './$types';
import { GuruDashboardService } from '$lib/server/services/guru-dashboard.service';

export const load: PageServerLoad = async ({ url }) => {
	const taParam = url.searchParams.get('tahunAjaranId');
	const tahunAjaranId = taParam ? parseInt(taParam, 10) : undefined;

	const dashboardData = await GuruDashboardService.getDashboardData(
		isNaN(tahunAjaranId!) ? undefined : tahunAjaranId
	);

	return {
		dashboardData
	};
};
