import type { PageServerLoad } from './$types';
import { GuruAttendanceRecapService } from '$lib/server/services/guru-attendance-recap.service';

export const load: PageServerLoad = async ({ url }) => {
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');
	const searchQuery = url.searchParams.get('q') || '';
	const activeTab = (url.searchParams.get('tab') as 'matrix' | 'logs') || 'matrix';
	const fromDashboard = url.searchParams.get('from') === 'dashboard';

	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	if (kelasInstanceId) {
		// Tier 2: Detailed Rekap Presensi report for selected Class/Rombel
		const recapData = await GuruAttendanceRecapService.getRecapDetail({
			kelasInstanceId,
			tahunAjaranId,
			searchQuery,
			activeTab
		});
		return {
			recapData: {
				...recapData,
				fromDashboard
			}
		};
	} else {
		// Tier 1: Grid Cards of all Rombels in the Academic Year
		const recapData = await GuruAttendanceRecapService.getGridCards(tahunAjaranId);
		return {
			recapData: {
				...recapData,
				fromDashboard: false
			}
		};
	}
};
