import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

import { compressImageBuffer } from './compressor';

export interface UploadResult {
	url: string;
	key: string;
	storageType: 'supabase' | 'r2' | 'local';
	originalSize?: number;
	compressedSize?: number;
	savedPercentage?: number;
}


const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_DOC_EXTENSIONS = new Set([
	// Documents & Text
	'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.rtf',
	// Lab Topologies & Network Configs
	'.pkt', '.gns3', '.pcap', '.pcapng', '.json', '.yaml', '.yml', '.conf', '.cfg', '.log',
	// Archives
	'.zip', '.rar', '.7z', '.tar', '.gz'
]);

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

	const maxMB = isAvatarFolder ? 5 : 20;
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
	const initialBuffer = Buffer.from(bytes);

	if (!checkMagicBytes(initialBuffer, ext)) {
		throw new Error('Isi file (magic bytes) tidak cocok dengan ekstensi file yang diunggah');
	}

	// Fitur Kompresi Gambar Backend Otomatis (WebP / Responsive Resize / Quality Optimization)
	const compressionResult = await compressImageBuffer(initialBuffer, ext, safeFolder);
	const buffer = compressionResult.buffer;
	const finalExt = compressionResult.ext;
	const mimeType = compressionResult.mimeType;

	const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${finalExt}`;
	const key = `${safeFolder}/${safeName}`;

	// 1. Primary: Supabase Storage
	const supabaseUrl =
		publicEnv.PUBLIC_SUPABASE_URL ||
		privateEnv.PUBLIC_SUPABASE_URL ||
		process.env.PUBLIC_SUPABASE_URL ||
		process.env.VITE_SUPABASE_URL;

	const supabaseKey =
		privateEnv.SUPABASE_SERVICE_ROLE_KEY ||
		publicEnv.PUBLIC_SUPABASE_ANON_KEY ||
		privateEnv.PUBLIC_SUPABASE_ANON_KEY ||
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.PUBLIC_SUPABASE_ANON_KEY;

	if (supabaseUrl && supabaseKey) {
		try {
			const supabase = createClient(supabaseUrl, supabaseKey);
			const { error } = await supabase.storage
				.from(safeFolder)
				.upload(safeName, buffer, {
					contentType: mimeType || file.type || 'application/octet-stream',
					upsert: true
				});

			if (!error) {
				const { data: publicUrlData } = supabase.storage
					.from(safeFolder)
					.getPublicUrl(safeName);

				return {
					url: publicUrlData.publicUrl,
					key,
					storageType: 'supabase',
					originalSize: compressionResult.originalSize,
					compressedSize: compressionResult.compressedSize,
					savedPercentage: compressionResult.savedPercentage
				};
			} else {
				console.error('Supabase storage upload error, falling back:', error);
			}
		} catch (err) {
			console.error('Supabase storage exception, falling back:', err);
		}
	}

	// 2. Secondary: Cloudflare R2
	if (
		privateEnv.R2_ACCOUNT_ID &&
		privateEnv.R2_ACCESS_KEY_ID &&
		privateEnv.R2_SECRET_ACCESS_KEY &&
		privateEnv.R2_BUCKET_NAME
	) {
		const r2Url = `https://${privateEnv.R2_BUCKET_NAME}.${privateEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
		try {
			const resp = await fetch(r2Url, {
				method: 'PUT',
				headers: {
					'Content-Type': mimeType || file.type || 'application/octet-stream'
				},
				body: new Uint8Array(buffer)
			});
			if (resp.ok) {
				const publicUrl = privateEnv.R2_PUBLIC_DOMAIN
					? `${privateEnv.R2_PUBLIC_DOMAIN}/${key}`
					: r2Url;
				return {
					url: publicUrl,
					key,
					storageType: 'r2',
					originalSize: compressionResult.originalSize,
					compressedSize: compressionResult.compressedSize,
					savedPercentage: compressionResult.savedPercentage
				};
			}
		} catch (err) {
			console.warn('R2 upload network fallback to local:', err);
		}
	}

	// 3. Fallback: save to local uploads directory in app/static/uploads
	try {
		const staticUploadsDir = path.join(process.cwd(), 'static', 'uploads', safeFolder);
		if (!fs.existsSync(staticUploadsDir)) {
			fs.mkdirSync(staticUploadsDir, { recursive: true });
		}

		const filePath = path.join(staticUploadsDir, safeName);
		fs.writeFileSync(filePath, buffer);

		const localUrl = `/uploads/${safeFolder}/${safeName}`;
		return {
			url: localUrl,
			key,
			storageType: 'local',
			originalSize: compressionResult.originalSize,
			compressedSize: compressionResult.compressedSize,
			savedPercentage: compressionResult.savedPercentage
		};
	} catch (fsErr: any) {
		console.error('Local filesystem upload failed:', fsErr);
		throw new Error(`Gagal menyimpan file: ${fsErr?.message || 'Gagal menyimpan ke penyimpanan lokal'}`);
	}
}

export async function deleteFile(urlOrKey: string): Promise<boolean> {
	if (!urlOrKey) return false;

	const supabaseUrl =
		publicEnv.PUBLIC_SUPABASE_URL ||
		privateEnv.PUBLIC_SUPABASE_URL ||
		process.env.PUBLIC_SUPABASE_URL ||
		process.env.VITE_SUPABASE_URL;

	const supabaseKey =
		privateEnv.SUPABASE_SERVICE_ROLE_KEY ||
		publicEnv.PUBLIC_SUPABASE_ANON_KEY ||
		privateEnv.PUBLIC_SUPABASE_ANON_KEY ||
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.PUBLIC_SUPABASE_ANON_KEY;

	if (urlOrKey.includes('/storage/v1/object/public/')) {
		try {
			const pathAfterPublic = urlOrKey.split('/storage/v1/object/public/')[1];
			const [bucket, ...rest] = pathAfterPublic.split('/');
			const filePath = rest.join('/');

			if (supabaseUrl && supabaseKey) {
				const supabase = createClient(supabaseUrl, supabaseKey);
				await supabase.storage.from(bucket).remove([filePath]);
				return true;
			}
		} catch (err) {
			console.warn('Supabase storage delete error:', err);
		}
	}

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
		privateEnv.R2_ACCOUNT_ID &&
		privateEnv.R2_ACCESS_KEY_ID &&
		privateEnv.R2_SECRET_ACCESS_KEY &&
		privateEnv.R2_BUCKET_NAME
	) {
		try {
			const key = urlOrKey.includes('.com/') ? urlOrKey.split('.com/')[1] : urlOrKey;
			const r2Url = `https://${privateEnv.R2_BUCKET_NAME}.${privateEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
			await fetch(r2Url, { method: 'DELETE' });
			return true;
		} catch (err) {
			console.warn('R2 delete file error:', err);
		}
	}

	return false;
}

