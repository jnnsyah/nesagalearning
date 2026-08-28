import { json, type RequestHandler } from '@sveltejs/kit';
import { deleteFile } from '$lib/server/storage/r2';
import { uploadRateLimiter } from '$lib/server/utils/rate-limiter';

// [Security] Folders that privileged roles (mentor/admin/guru) exclusively own.
// A siswa is never allowed to delete from these folders.
const PRIVILEGED_FOLDERS = ['materials', 'attachments'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// [Security] Rate-limit delete actions: max 20 per minute per user.
	const rateLimit = uploadRateLimiter.check(`delete_${locals.user.id}`, 20, 60000);
	if (!rateLimit.allowed) {
		return json(
			{ error: `Batas penghapusan file tercapai. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.` },
			{ status: 429 }
		);
	}

	try {
		const { url } = await request.json();
		if (!url || typeof url !== 'string') {
			return json({ error: 'URL file wajib diisi' }, { status: 400 });
		}

		// [Security] Siswa may only delete files from their own permitted folders.
		// Mentor/admin/guru can delete from any folder.
		const isSiswa = locals.user.role === 'siswa';
		if (isSiswa) {
			// Extract folder segment from the URL path.
			// Expected pattern: .../folder/filename  (R2 key or local path)
			const urlPath = (() => {
				try {
					return new URL(url).pathname;
				} catch {
					return url;
				}
			})();

			const isPrivileged = PRIVILEGED_FOLDERS.some((folder) =>
				urlPath.includes(`/${folder}/`)
			);

			if (isPrivileged) {
				return json(
					{ error: 'Anda tidak memiliki izin untuk menghapus file ini.' },
					{ status: 403 }
				);
			}
		}

		await deleteFile(url);
		return json({ success: true });
	} catch (err: unknown) {
		console.error('File delete error:', err);
		return json({ error: 'Gagal menghapus file' }, { status: 500 });
	}
};
