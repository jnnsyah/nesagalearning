import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { PertemuanService } from '$lib/server/services/pertemuan.service';
import { createPertemuanSchema } from '$lib/validators/pertemuan';
import { db } from '$lib/server/db';
import { kelasInstance } from '$lib/server/db/schema/academic';
import { subPhase } from '$lib/server/db/schema/curriculum';

import { OperationalMasterAdminService } from '$lib/server/services/operational-master-admin.service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const [meetings, kelases, subPhases, masterData] = await Promise.all([
		PertemuanService.getAllPertemuan(),
		db.select({ id: kelasInstance.id, name: kelasInstance.name }).from(kelasInstance),
		db.select({ id: subPhase.id, title: subPhase.title }).from(subPhase),
		OperationalMasterAdminService.getOperationalMasterData()
	]);

	return {
		meetings,
		kelases,
		subPhases,
		activityTypesOptions: masterData.activityTypes.map((a) => ({ value: a.code, label: a.name })),
		roomsOptions: masterData.rooms.map((r) => ({ value: r.name, label: r.name }))
	};
};

function checkIsWeekend(dateStr: string): boolean {
	if (!dateStr) return false;
	const [y, m, d] = dateStr.split('-').map(Number);
	if (!y || !m || !d) return false;
	const dayOfWeek = new Date(y, m - 1, d).getDay();
	return dayOfWeek === 0 || dayOfWeek === 6;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const kelasInstanceId = Number(formData.get('kelasInstanceId'));
		const subPhaseId = Number(formData.get('subPhaseId'));
		const title = formData.get('title') as string;
		const activityType = formData.get('activityType') as any;
		const sessionDate = formData.get('sessionDate') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const location = formData.get('location') as string;
		const materialUrl = formData.get('materialUrl') as string;
		const isWeekend = checkIsWeekend(sessionDate) || formData.get('isWeekend') === 'true';

		const hasTask = formData.get('hasTask') === 'true';
		const taskTitle = formData.get('taskTitle') as string;
		const taskDescription = formData.get('taskDescription') as string;
		const taskSize = (formData.get('taskSize') as any) || 'sedang';

		const rawInput = {
			kelasInstanceId,
			subPhaseId,
			title,
			activityType,
			sessionDate,
			startTime,
			endTime,
			location,
			materialUrl,
			isWeekend,
			task: hasTask && taskTitle ? { title: taskTitle, description: taskDescription, taskSize } : undefined
		};

		const parseResult = createPertemuanSchema.safeParse(rawInput);
		if (!parseResult.success) {
			const errors = parseResult.error.flatten().fieldErrors;
			return fail(400, { errors, data: rawInput });
		}

		await PertemuanService.createPertemuan(parseResult.data);
		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!id || isNaN(id)) {
			return fail(400, { message: 'ID Pertemuan tidak valid' });
		}

		const kelasInstanceId = Number(formData.get('kelasInstanceId'));
		const subPhaseId = Number(formData.get('subPhaseId'));
		const title = formData.get('title') as string;
		const activityType = formData.get('activityType') as any;
		const sessionDate = formData.get('sessionDate') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const location = formData.get('location') as string;
		const materialUrl = formData.get('materialUrl') as string;
		const isWeekend = checkIsWeekend(sessionDate) || formData.get('isWeekend') === 'true';

		const hasTask = formData.get('hasTask') === 'true';
		const taskTitle = formData.get('taskTitle') as string;
		const taskDescription = formData.get('taskDescription') as string;
		const taskSize = (formData.get('taskSize') as any) || 'sedang';

		const rawInput = {
			kelasInstanceId,
			subPhaseId,
			title,
			activityType,
			sessionDate,
			startTime,
			endTime,
			location,
			materialUrl,
			isWeekend,
			task: hasTask && taskTitle ? { title: taskTitle, description: taskDescription, taskSize } : undefined
		};

		await PertemuanService.updatePertemuan(id, rawInput);
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const idStr = formData.get('id') as string;
		const id = Number(idStr);

		if (!id || isNaN(id)) {
			return fail(400, { message: 'ID Pertemuan tidak valid' });
		}

		await PertemuanService.deletePertemuan(id);
		return { success: true };
	}
};

