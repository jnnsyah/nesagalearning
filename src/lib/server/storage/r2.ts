import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
	url: string;
	key: string;
	storageType: 'r2' | 'local';
}

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_DOC_EXTENSIONS = new Set(['.pdf', '.zip', '.rar', '.txt', '.docx', '.xlsx', '.pptx', '.csv']);

const DANGEROUS_EXTENSIONS = new Set([
	'.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.phar',
	'.exe', '.sh', '.bat', '.cmd', '.js', '.jsx', '.ts', '.tsx',
	'.html', '.htm', '.xhtml', '.pl', '.py', '.rb', '.cgi', '.dll',
	'.so', '.vbs', '.scr', '.svg'
]);

const ALLOWED_FOLDERS = new Set(['materials', 'avatars', 'submissions', 'attachments']);

export function sanitizeFolder(folder: string): string {
	if (!folder) return 'materials';
	const base = path.basename(folder).toLowerCase().trim();
	return ALLOWED_FOLDERS.has(base) ? base : 'materials';
}

export function checkMagicBytes(buffer: Buffer, ext: string): boolean {
	if (buffer.length < 4) return false;

	switch (ext) {
		case '.jpg':
		case '.jpeg':
			return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
		case '.png':
			return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
		case '.gif':
			return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
		case '.webp':
			return buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP';
		case '.pdf':
			return buffer.toString('utf8', 0, 4) === '%PDF';
		default:
			return true;
	}
}

export function validateFile(file: File, folder: string): { valid: boolean; error?: string; ext: string; safeFolder: string } {
	if (!file || !(file instanceof File) || file.size === 0) {
		return { valid: false, error: 'File tidak valid atau kosong', ext: '', safeFolder: 'materials' };
	}

	const safeFolder = sanitizeFolder(folder);
	const ext = path.extname(file.name || '').toLowerCase().trim();

	if (!ext || DANGEROUS_EXTENSIONS.has(ext)) {
		return { valid: false, error: 'Tipe file terlarang atau berpotensi bahaya', ext: '', safeFolder };
	}

	const isAvatarFolder = safeFolder === 'avatars';
	if (isAvatarFolder) {
		if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
			return { valid: false, error: 'Format foto profil hanya diperbolehkan JPG, PNG, WEBP, atau GIF', ext, safeFolder };
		}
	} else {
		const isImg = ALLOWED_IMAGE_EXTENSIONS.has(ext);
		const isDoc = ALLOWED_DOC_EXTENSIONS.has(ext);
		if (!isImg && !isDoc) {
			return { valid: false, error: 'Format ekstensi file tidak didukung oleh sistem', ext, safeFolder };
		}
	}

	const maxMB = isAvatarFolder ? 5 : 15;
	const maxBytes = maxMB * 1024 * 1024;
	if (file.size > maxBytes) {
		return { valid: false, error: `Ukuran file melebihi batas maksimal ${maxMB} MB`, ext, safeFolder };
	}

	return { valid: true, ext, safeFolder };
}

export async function uploadFile(
	file: File,
	folder: string = 'materials'
): Promise<UploadResult> {
	const validation = validateFile(file, folder);
	if (!validation.valid) {
		throw new Error(validation.error || 'File tidak valid');
	}

	const safeFolder = validation.safeFolder;
	const ext = validation.ext;

	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);

	if (!checkMagicBytes(buffer, ext)) {
		throw new Error('Isi file (magic bytes) tidak cocok dengan ekstensi file yang diunggah');
	}

	const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
	const key = `${safeFolder}/${safeName}`;

	// If R2 credentials are set in environment, upload to R2
	if (
		env.R2_ACCOUNT_ID &&
		env.R2_ACCESS_KEY_ID &&
		env.R2_SECRET_ACCESS_KEY &&
		env.R2_BUCKET_NAME
	) {
		const r2Url = `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
		try {
			const resp = await fetch(r2Url, {
				method: 'PUT',
				headers: {
					'Content-Type': file.type || 'application/octet-stream'
				},
				body: buffer
			});
			if (resp.ok) {
				const publicUrl = env.R2_PUBLIC_DOMAIN
					? `${env.R2_PUBLIC_DOMAIN}/${key}`
					: r2Url;
				return { url: publicUrl, key, storageType: 'r2' };
			}
		} catch (err) {
			console.warn('R2 upload network fallback to local:', err);
		}
	}

	// Fallback: save to local uploads directory in app/static/uploads
	const staticUploadsDir = path.join(process.cwd(), 'static', 'uploads', safeFolder);
	if (!fs.existsSync(staticUploadsDir)) {
		fs.mkdirSync(staticUploadsDir, { recursive: true });
	}

	const filePath = path.join(staticUploadsDir, safeName);
	fs.writeFileSync(filePath, buffer);

	const localUrl = `/uploads/${safeFolder}/${safeName}`;
	return { url: localUrl, key, storageType: 'local' };
}

export async function deleteFile(urlOrKey: string): Promise<boolean> {
	if (!urlOrKey) return false;

	if (urlOrKey.startsWith('/uploads/')) {
		const relativePath = urlOrKey.replace('/uploads/', '');
		const safeRelative = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
		const filePath = path.join(process.cwd(), 'static', 'uploads', safeRelative);
		if (fs.existsSync(filePath)) {
			try {
				fs.unlinkSync(filePath);
				return true;
			} catch (err) {
				console.error('Failed to delete local file:', err);
				return false;
			}
		}
	}

	if (
		env.R2_ACCOUNT_ID &&
		env.R2_ACCESS_KEY_ID &&
		env.R2_SECRET_ACCESS_KEY &&
		env.R2_BUCKET_NAME
	) {
		try {
			const key = urlOrKey.includes('.com/') ? urlOrKey.split('.com/')[1] : urlOrKey;
			const r2Url = `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
			await fetch(r2Url, { method: 'DELETE' });
			return true;
		} catch (err) {
			console.warn('R2 delete file error:', err);
		}
	}

	return false;
}
