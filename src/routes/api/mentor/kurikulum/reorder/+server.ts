import { json, type RequestHandler } from '@sveltejs/kit';
import { CurriculumService } from '$lib/server/services/curriculum.service';
import { z } from 'zod';

const reorderApiSchema = z.object({
	type: z.enum(['phase', 'subPhase', 'materi']),
	parentId: z.number(),
	orderedIds: z.array(z.number())
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'mentor') {
		return json({ error: 'Akses ditolak' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const parse = reorderApiSchema.safeParse(body);

		if (!parse.success) {
			return json({ error: 'Payload reorder tidak valid', details: parse.error.format() }, { status: 400 });
		}

		const { type, parentId, orderedIds } = parse.data;

		if (type === 'phase') {
			await CurriculumService.reorderPhases(parentId, orderedIds);
		} else if (type === 'subPhase') {
			await CurriculumService.reorderSubPhases(parentId, orderedIds);
		} else if (type === 'materi') {
			await CurriculumService.reorderMateris(parentId, orderedIds);
		}

		return json({ success: true });
	} catch (err: any) {
		console.error('Reorder API Error:', err);
		return json({ error: err?.message || 'Gagal melakukan reorder' }, { status: 500 });
	}
};
