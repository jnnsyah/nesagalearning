import type { PageServerLoad } from './$types';
import { CurriculumMonitoringService } from '$lib/server/services/curriculum-monitoring.service';

export const load: PageServerLoad = async ({ url }) => {
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const tingkatIdParam = url.searchParams.get('tingkatId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');

	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const tingkatId = tingkatIdParam ? Number(tingkatIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	const monitoringData = await CurriculumMonitoringService.getCurriculumMonitoring({
		tahunAjaranId,
		tingkatId,
		kelasInstanceId
	});

	return {
		monitoringData
	};
};
