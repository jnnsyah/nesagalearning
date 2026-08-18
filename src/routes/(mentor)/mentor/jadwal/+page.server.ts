import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PertemuanService } from '$lib/server/services/pertemuan.service';
import { db } from '$lib/server/db';
import { kelasInstance } from '$lib/server/db/schema/academic';
import { OperationalMasterAdminService } from '$lib/server/services/operational-master-admin.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const [meetings, kelases, masterData] = await Promise.all([
		PertemuanService.getAllPertemuan(),
		db.select({
			id: kelasInstance.id,
			name: kelasInstance.name,
			curriculumTrackId: kelasInstance.curriculumTrackId
		}).from(kelasInstance),
		OperationalMasterAdminService.getOperationalMasterData()
	]);

	return {
		user: locals.user,
		meetings,
		kelases,
		activityTypesOptions: masterData.activityTypes.map((a) => ({ value: a.code, label: a.name })),
		roomsOptions: masterData.rooms.map((r) => ({ value: r.name, label: r.name }))
	};
};
