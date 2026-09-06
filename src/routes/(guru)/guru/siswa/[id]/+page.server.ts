import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { AdvisorDetailService } from '$lib/server/services/advisor-detail.service';
import { ProgressService } from '$lib/server/services/progress.service';
import { db } from '$lib/server/db';
import { keanggotaan, kelasInstance, tahunAjaran, tingkat } from '$lib/server/db/schema/academic';
import { curriculumTrack } from '$lib/server/db/schema/curriculum';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const studentId = parseInt(params.id, 10);
	if (isNaN(studentId)) {
		throw error(400, 'ID Siswa tidak valid');
	}

	const detailData = await AdvisorDetailService.getStudentDetail(studentId);
	if (!detailData) {
		throw error(404, 'Data siswa tidak ditemukan');
	}

	const [activeMembership] = await db
		.select({
			kelasInstanceId: keanggotaan.kelasInstanceId,
			kelasName: kelasInstance.name,
			tahunAjaranName: tahunAjaran.name,
			tingkatName: tingkat.name
		})
		.from(keanggotaan)
		.innerJoin(kelasInstance, eq(keanggotaan.kelasInstanceId, kelasInstance.id))
		.innerJoin(tahunAjaran, eq(kelasInstance.tahunAjaranId, tahunAjaran.id))
		.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
		.where(and(eq(keanggotaan.userId, studentId), eq(keanggotaan.status, 'aktif')))
		.limit(1);

	let phaseProgress: any[] = [];
	let trackInfo: any = null;

	if (activeMembership) {
		const [kelasTrackData] = await db
			.select({
				trackId: curriculumTrack.id,
				trackTitle: curriculumTrack.title,
				trackDescription: curriculumTrack.description,
				tingkatName: tingkat.name
			})
			.from(kelasInstance)
			.innerJoin(curriculumTrack, eq(kelasInstance.curriculumTrackId, curriculumTrack.id))
			.innerJoin(tingkat, eq(kelasInstance.tingkatId, tingkat.id))
			.where(eq(kelasInstance.id, activeMembership.kelasInstanceId))
			.limit(1);

		trackInfo = kelasTrackData || null;
		phaseProgress = await ProgressService.getStudentPhaseProgress(
			studentId,
			activeMembership.kelasInstanceId
		);
	}

	return {
		detailData,
		activeMembership: activeMembership || null,
		trackInfo,
		phaseProgress
	};
};

export const actions: Actions = {
	addNote: async ({ request, params, locals }) => {
		const studentId = parseInt(params.id, 10);
		if (isNaN(studentId)) {
			return fail(400, { error: 'ID Siswa tidak valid' });
		}

		const formData = await request.formData();
		const noteText = (formData.get('note') as string)?.trim();
		const category = (formData.get('category') as string)?.trim() || 'intervensi';

		if (!noteText) {
			return fail(400, { error: 'Catatan intervensi tidak boleh kosong' });
		}

		const advisorId = Number(locals.user?.id) || 1;

		try {
			await AdvisorDetailService.addAdvisorNote({
				studentId,
				advisorId,
				note: noteText,
				category
			});

			return {
				success: true,
				message: 'Catatan pendampingan berhasil disimpan'
			};
		} catch (err: any) {
			console.error('Failed to add advisor note:', err);
			return fail(500, { error: 'Gagal menyimpan catatan intervensi' });
		}
	}
};
