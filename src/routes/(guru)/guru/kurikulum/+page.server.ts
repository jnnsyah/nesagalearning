import type { PageServerLoad } from './$types';
import { CurriculumMonitoringService } from '$lib/server/services/curriculum-monitoring.service';

export const load: PageServerLoad = async ({ url }) => {
	const tingkatIdParam = url.searchParams.get('tingkatId');
	const trackIdParam = url.searchParams.get('trackId');

	const tingkatId = tingkatIdParam ? Number(tingkatIdParam) : undefined;
	const trackId = trackIdParam ? Number(trackIdParam) : undefined;

	const monitoringData = await CurriculumMonitoringService.getCurriculumMonitoring({
		tingkatId,
		trackId
	});

	return {
		monitoringData
	};
};
