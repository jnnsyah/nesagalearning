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
	const taIdParam = url.searchParams.get('taId');
	const searchParam = url.searchParams.get('search') || '';
	const riskLevelParam = url.searchParams.get('risk') || 'semua';
	const pageParam = url.searchParams.get('page');

	const parsedKelasId = kelasIdParam ? Number(kelasIdParam) : null;
	const parsedTaId = taIdParam ? Number(taIdParam) : undefined;
	const page = pageParam ? Math.max(1, Number(pageParam)) : 1;

	// Always fetch Class Health Cards for Academic Year view
	const cardsData = await ClassHealthService.getClassHealthCards(parsedTaId);

	if (!parsedKelasId) {
		return {
			user: locals.user,
			viewMode: 'grid' as const,
			cardsData,
			classOptions: cardsData.classCards.map((c) => ({
				id: c.kelasId,
				name: c.kelasName,
				tahunAjaranId: c.tahunAjaranId,
				tahunAjaranName: c.tahunAjaranName,
				tingkatName: c.tingkatName,
				isActive: true
			})),
			selectedKelas: null,
			summary: null,
			alertStudentsCount: 0,
			rosterData: { items: [], total: 0, page: 1, limit: 15, totalPages: 1 },
			filters: {
				taId: cardsData.selectedTahunAjaran?.id || 0,
				kelasId: null,
				search: searchParam,
				riskLevel: riskLevelParam,
				page: 1
			}
		};
	}

	// Detail View for a selected class
	const { classOptions, selectedKelas, summary, alertStudentsCount } =
		await ClassHealthService.getClassHealthSummary(parsedKelasId);

	const rosterData = await ClassHealthService.getStudentHealthRoster({
		kelasId: summary.kelasId,
		search: searchParam,
		riskLevel: riskLevelParam,
		page,
		limit: 15
	});

	return {
		user: locals.user,
		viewMode: 'detail' as const,
		cardsData,
		classOptions,
		selectedKelas,
		summary,
		alertStudentsCount,
		rosterData,
		filters: {
			taId: cardsData.selectedTahunAjaran?.id || 0,
			kelasId: summary.kelasId,
			search: searchParam,
			riskLevel: riskLevelParam,
			page
		}
	};
};
