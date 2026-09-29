import { json, type RequestHandler } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage/r2';
import { uploadRateLimiter } from '$lib/server/utils/rate-limiter';

const ALLOWED_FOLDERS = ['avatars', 'materials', 'submissions', 'attachments'];
const DANGEROUS_EXTENSIONS = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js', '.mjs', '.py', '.pl', '.html', '.htm', '.phtml', '.cgi'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 1. Rate Limiting: Max 10 uploads per minute per user
	const rateLimit = uploadRateLimiter.check(`upload_${locals.user.id}`, 10, 60000);
	if (!rateLimit.allowed) {
		return json(
			{ error: `Batas upload tercapai. Silakan tunggu ${Math.ceil(rateLimit.resetInMs / 1000)} detik.` },
			{ status: 429 }
		);
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const folderInput = (formData.get('folder') as string) || 'materials';

		if (!file) {
			return json({ error: 'File wajib diunggah' }, { status: 400 });
		}

		// 2. Folder Whitelist Validation
		const folder = ALLOWED_FOLDERS.includes(folderInput) ? folderInput : 'materials';

		// [Security] Siswa may only upload to 'submissions' and 'avatars'.
		// Folders like 'materials' and 'attachments' are reserved for mentor/admin/guru.
		const isSiswa = locals.user.role === 'siswa';
		const SISWA_ALLOWED_FOLDERS = ['submissions', 'avatars'];
		if (isSiswa && !SISWA_ALLOWED_FOLDERS.includes(folder)) {
			return json(
				{ error: 'Anda tidak memiliki izin untuk mengupload ke folder ini.' },
				{ status: 403 }
			);
		}

		// 3. File Size Validation (Avatars max 5MB, materials max 10MB, others max 20MB)
		let maxSizeBytes = 20 * 1024 * 1024;
		let maxMbStr = '20MB';
		if (folder === 'avatars') {
			maxSizeBytes = 5 * 1024 * 1024;
			maxMbStr = '5MB';
		} else if (folder === 'materials') {
			maxSizeBytes = 10 * 1024 * 1024;
			maxMbStr = '10MB';
		}

		if (file.size > maxSizeBytes) {
			return json({ error: `Ukuran file melebihi batas maksimum ${maxMbStr}.` }, { status: 400 });
		}

		// 4. Extension & Dangerous File Check
		const filenameLower = file.name.toLowerCase();
		const isDangerous = DANGEROUS_EXTENSIONS.some((ext) => filenameLower.endsWith(ext));
		if (isDangerous) {
			return json({ error: 'Tipe file yang diunggah dilarang karena alasan keamanan.' }, { status: 400 });
		}

		// 5. Avatar specific image MIME check
		if (folder === 'avatars' && !file.type.startsWith('image/')) {
			return json({ error: 'Foto profil harus berupa file gambar (JPG, PNG, WEBP, GIF).' }, { status: 400 });
		}

		const result = await uploadFile(file, folder);
		return json({
			success: true,
			url: result.url,
			key: result.key,
			storageType: result.storageType,
			originalSize: result.originalSize,
			compressedSize: result.compressedSize,
			savedPercentage: result.savedPercentage
		});
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'Gagal mengunggah file';
		console.error('File upload error:', err);
		return json({ error: errorMessage }, { status: 400 });
	}
};
