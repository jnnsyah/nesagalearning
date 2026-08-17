import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { PertemuanService } from '$lib/server/services/pertemuan.service';
import { createPertemuanSchema } from '$lib/validators/pertemuan';
import { db } from '$lib/server/db';
import { kelasInstance } from '$lib/server/db/schema/academic';
import { subPhase } from '$lib/server/db/schema/curriculum';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const kelases = await db.select({ id: kelasInstance.id, name: kelasInstance.name }).from(kelasInstance);
	const subPhases = await db.select({ id: subPhase.id, title: subPhase.title }).from(subPhase);

	return {
		kelases,
		subPhases
	};
};

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
		const isWeekend = formData.get('isWeekend') === 'true';

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
		throw redirect(303, '/mentor/pertemuan');
	}
};
