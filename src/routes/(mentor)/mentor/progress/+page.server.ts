import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CurriculumMonitoringService } from '$lib/server/services/curriculum-monitoring.service';
import { MentorStudentRosterService } from '$lib/server/services/mentor-student-roster.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	if (locals.user.role !== 'mentor' && locals.user.role !== 'admin') {
		throw redirect(302, '/login');
	}

	const trackIdParam = url.searchParams.get('trackId');
	const tahunAjaranIdParam = url.searchParams.get('tahunAjaranId');
	const kelasInstanceIdParam = url.searchParams.get('kelasInstanceId');

	const trackId = trackIdParam ? Number(trackIdParam) : undefined;
	const tahunAjaranId = tahunAjaranIdParam ? Number(tahunAjaranIdParam) : undefined;
	const kelasInstanceId = kelasInstanceIdParam ? Number(kelasInstanceIdParam) : undefined;

	try {
		// Fetch mentor's assigned classes for class selector dropdown
		const mentorClasses = await MentorStudentRosterService.getMentorClasses(locals.user.id, tahunAjaranId);

		if (trackId) {
			// Tier 2: Detail View for specific Curriculum Track & student roster progress
			const monitoringData = await CurriculumMonitoringService.getTrackDetail({
				trackId,
				tahunAjaranId,
				kelasInstanceId
			});

			// Fetch roster data if a specific class is selected
			let rosterData = null;
			const targetKelasId = monitoringData.selectedKelas?.id || (mentorClasses[0]?.id ?? null);
			if (targetKelasId) {
				rosterData = await MentorStudentRosterService.getRosterData({
					mentorUserId: locals.user.id,
					kelasInstanceId: targetKelasId,
					tahunAjaranId: monitoringData.selectedTahunAjaran?.id
				});
			}

			return {
				user: locals.user,
				mentorClasses,
				monitoringData: {
					...monitoringData,
					fromDashboard: false
				},
				rosterData
			};
		} else {
			// Tier 1: Grid Card View of Curriculum Tracks for the selected Academic Year & Class (only active/applied tracks)
			const monitoringData = await CurriculumMonitoringService.getTrackCards(tahunAjaranId, {
				onlyExecuting: true,
				kelasInstanceId
			});

			return {
				user: locals.user,
				mentorClasses,
				monitoringData: {
					...monitoringData,
					fromDashboard: false
				},
				rosterData: null
			};
		}
	} catch (err: any) {
		console.error('[Mentor Progress Load Error]:', err);
		// Graceful fallback fetching tahunAjaranOptions & mentorClasses safely
		const [tahunAjaranOptions, mentorClasses] = await Promise.all([
			CurriculumMonitoringService.getTahunAjaranOptions().catch(() => []),
			MentorStudentRosterService.getMentorClasses(locals.user.id, tahunAjaranId).catch(() => [])
		]);

		return {
			user: locals.user,
			mentorClasses,
			monitoringData: {
				viewMode: 'grid' as const,
				tahunAjaranOptions,
				selectedTahunAjaran: tahunAjaranOptions.find((ta) => ta.isActive) || tahunAjaranOptions[0] || null,
				trackCards: [],
				fromDashboard: false
			},
			rosterData: null
		};
	}
};
