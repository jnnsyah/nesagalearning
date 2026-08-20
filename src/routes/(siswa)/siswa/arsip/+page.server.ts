import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { StudentArchiveService } from '$lib/server/services/student-archive.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'siswa') {
		throw redirect(303, '/login');
	}

	const userId = Number(locals.user.id);
	const memberships = await StudentArchiveService.getStudentMemberships(userId);

	if (memberships.length === 0) {
		return {
			user: locals.user,
			memberships: [],
			selectedKelasId: null,
			archiveData: null
		};
	}

	const kelasParam = url.searchParams.get('kelasId');
	let selectedKelasId = kelasParam ? Number(kelasParam) : memberships[0].kelasInstanceId;

	// Fallback if provided kelasId is not valid for this user
	const isValidKelas = memberships.some((m) => m.kelasInstanceId === selectedKelasId);
	if (!isValidKelas) {
		selectedKelasId = memberships[0].kelasInstanceId;
	}

	const archiveData = await StudentArchiveService.getArchiveDataForClass(userId, selectedKelasId);

	return {
		user: locals.user,
		memberships,
		selectedKelasId,
		archiveData
	};
};
