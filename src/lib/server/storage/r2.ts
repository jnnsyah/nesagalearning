import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
	url: string;
	key: string;
	storageType: 'r2' | 'local';
}

export async function uploadFile(
	file: File,
	folder: string = 'materials'
): Promise<UploadResult> {
	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);
	const ext = path.extname(file.name) || '.bin';
	const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
	const key = `${folder}/${safeName}`;

	// If R2 credentials are set in environment, upload to R2
	if (
		env.R2_ACCOUNT_ID &&
		env.R2_ACCESS_KEY_ID &&
		env.R2_SECRET_ACCESS_KEY &&
		env.R2_BUCKET_NAME
	) {
		const r2Url = `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
		// # ponytail: R2 S3 compatibility fallback to local storage if network unconfigured
		try {
			// Basic fetch upload if R2 endpoint is ready
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
	const staticUploadsDir = path.join(process.cwd(), 'static', 'uploads', folder);
	if (!fs.existsSync(staticUploadsDir)) {
		fs.mkdirSync(staticUploadsDir, { recursive: true });
	}

	const filePath = path.join(staticUploadsDir, safeName);
	fs.writeFileSync(filePath, buffer);

	const localUrl = `/uploads/${folder}/${safeName}`;
	return { url: localUrl, key, storageType: 'local' };
}

export async function deleteFile(urlOrKey: string): Promise<boolean> {
	if (!urlOrKey) return false;

	if (urlOrKey.startsWith('/uploads/')) {
		const relativePath = urlOrKey.replace('/uploads/', '');
		const filePath = path.join(process.cwd(), 'static', 'uploads', relativePath);
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
