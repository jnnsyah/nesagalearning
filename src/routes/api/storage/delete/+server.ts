import { json, type RequestHandler } from '@sveltejs/kit';
import { deleteFile } from '$lib/server/storage/r2';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { url } = await request.json();
		if (!url) {
			return json({ error: 'URL file wajib diisi' }, { status: 400 });
		}

		await deleteFile(url);
		return json({ success: true });
	} catch (err: unknown) {
		console.error('File delete error:', err);
		return json({ error: 'Gagal menghapus file' }, { status: 500 });
	}
};
