import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { kelasInstance } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { CurriculumMonitoringService } from '$lib/server/services/curriculum-monitoring.service';

export const load: PageServerLoad = async ({ url }) => {
	const trackIdParam = url.searchParams.get('trackId');
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');

	let trackId = trackIdParam ? Number(trackIdParam) : undefined;
	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	// Auto-resolve trackId from kelasInstanceId if trackId is omitted from URL
	if (!trackId && kelasInstanceId) {
		const [cRow] = await db
			.select({ trackId: kelasInstance.curriculumTrackId })
			.from(kelasInstance)
			.where(eq(kelasInstance.id, kelasInstanceId));

		if (cRow?.trackId) {
			trackId = cRow.trackId;
		}
	}

	if (trackId) {
		// Tier 2: Detail View for specific Curriculum Track and pre-selected Class Instance
		const monitoringData = await CurriculumMonitoringService.getTrackDetail({
			trackId,
			tahunAjaranId,
			kelasInstanceId
		});
		return { monitoringData };
	} else {
		// Tier 1: Grid Card View of all Curriculum Tracks in Academic Year
		const monitoringData = await CurriculumMonitoringService.getTrackCards(tahunAjaranId);
		return { monitoringData };
	}
};
