import { json, type RequestHandler } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage/r2';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const folder = (formData.get('folder') as string) || 'materials';

		if (!file) {
			return json({ error: 'File wajib diunggah' }, { status: 400 });
		}

		const result = await uploadFile(file, folder);
		return json({
			success: true,
			url: result.url,
			key: result.key,
			storageType: result.storageType
		});
	} catch (err: unknown) {
		console.error('File upload error:', err);
		return json({ error: 'Gagal mengunggah file' }, { status: 500 });
	}
};
