import type { PageServerLoad } from './$types';
import { GuruAttendanceRecapService } from '$lib/server/services/guru-attendance-recap.service';

export const load: PageServerLoad = async ({ url }) => {
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');
	const searchQuery = url.searchParams.get('q') || '';
	const activeTab = (url.searchParams.get('tab') as 'matrix' | 'logs') || 'matrix';

	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	const recapData = await GuruAttendanceRecapService.getAttendanceRecapData({
		tahunAjaranId,
		kelasInstanceId,
		searchQuery,
		activeTab
	});

	return { recapData };
};
