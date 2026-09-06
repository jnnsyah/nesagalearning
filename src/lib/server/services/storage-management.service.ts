import fs from 'fs';
import path from 'path';
import { env as privateEnv } from '$env/dynamic/private';
import { db } from '../db';
import { user } from '../db/schema/auth';
import { avatar } from '../db/schema/system';
import { materi } from '../db/schema/curriculum';
import { pertemuan } from '../db/schema/session';
import { submission } from '../db/schema/task';
import { isNotNull } from 'drizzle-orm';
import { AuditLogService } from './audit-log.service';

export interface LocalFileInfo {
	key: string;
	folder: string;
	fileName: string;
	fullPath: string;
	sizeBytes: number;
	updatedAt: Date;
}

export interface StorageOverview {
	activeBaseDir: string;
	totalBytes: number;
	totalFiles: number;
	folderStats: Record<string, { bytes: number; count: number }>;
	r2Backup: {
		isConfigured: boolean;
		bucketName: string | null;
		accountId: string | null;
	};
	orphanStats: {
		orphanCount: number;
		orphanBytes: number;
	};
}

export interface OrphanReport {
	totalOrphans: number;
	totalOrphanBytes: number;
	orphanFiles: Array<{
		key: string;
		folder: string;
		fileName: string;
		sizeBytes: number;
		updatedAt: Date;
	}>;
}

function getUploadBaseDir(): string {
	const candidates = [
		process.env.UPLOADS_DIR || '/app/uploads',
		path.join(process.cwd(), 'uploads'),
		path.join(process.cwd(), 'static', 'uploads')
	];
	for (const dir of candidates) {
		if (fs.existsSync(dir)) return dir;
	}
	return path.join(process.cwd(), 'uploads');
}

function scanDirFiles(baseDir: string): LocalFileInfo[] {
	const files: LocalFileInfo[] = [];
	if (!fs.existsSync(baseDir)) return files;

	const folders = ['materials', 'avatars', 'submissions', 'attachments'];
	for (const folder of folders) {
		const targetDir = path.join(baseDir, folder);
		if (fs.existsSync(targetDir)) {
			const entries = fs.readdirSync(targetDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isFile()) {
					const fullPath = path.join(targetDir, entry.name);
					try {
						const stats = fs.statSync(fullPath);
						files.push({
							key: `${folder}/${entry.name}`,
							folder,
							fileName: entry.name,
							fullPath,
							sizeBytes: stats.size,
							updatedAt: stats.mtime
						});
					} catch (e) {
						// ignore inaccessible file
					}
				}
			}
		}
	}
	return files;
}

function normalizeToKey(urlOrPath: string | null | undefined): string | null {
	if (!urlOrPath) return null;
	const match = urlOrPath.match(/(materials|avatars|submissions|attachments)\/[^?#\s]+/i);
	if (match) {
		return match[0].toLowerCase();
	}
	return null;
}

export const StorageManagementService = {
	/**
	 * Get set of all referenced file keys in database
	 */
	async getReferencedFileKeys(): Promise<Set<string>> {
		const referencedKeys = new Set<string>();

		try {
			const [userAvatars, systemAvatars, pertemuanMaterials, submissionLinks, materiRecords] = await Promise.all([
				db.select({ avatarUrl: user.avatarUrl }).from(user).where(isNotNull(user.avatarUrl)),
				db.select({ imageUrl: avatar.imageUrl }).from(avatar).where(isNotNull(avatar.imageUrl)),
				db.select({ materialUrl: pertemuan.materialUrl }).from(pertemuan).where(isNotNull(pertemuan.materialUrl)),
				db.select({ link: submission.link }).from(submission).where(isNotNull(submission.link)),
				db.select({ attachments: materi.attachments }).from(materi).where(isNotNull(materi.attachments))
			]);

			for (const row of userAvatars) {
				const k = normalizeToKey(row.avatarUrl);
				if (k) referencedKeys.add(k);
			}
			for (const row of systemAvatars) {
				const k = normalizeToKey(row.imageUrl);
				if (k) referencedKeys.add(k);
			}
			for (const row of pertemuanMaterials) {
				const k = normalizeToKey(row.materialUrl);
				if (k) referencedKeys.add(k);
			}
			for (const row of submissionLinks) {
				const k = normalizeToKey(row.link);
				if (k) referencedKeys.add(k);
			}
			for (const row of materiRecords) {
				if (Array.isArray(row.attachments)) {
					for (const att of row.attachments) {
						const k = normalizeToKey(att?.url);
						if (k) referencedKeys.add(k);
					}
				}
			}
		} catch (err) {
			console.error('[StorageManagementService.getReferencedFileKeys error]:', err);
		}

		return referencedKeys;
	},

	/**
	 * Detect orphan files (files on disk not referenced in DB)
	 */
	async getOrphanReport(): Promise<OrphanReport> {
		const baseDir = getUploadBaseDir();
		const files = scanDirFiles(baseDir);
		const refKeys = await this.getReferencedFileKeys();

		const orphanFiles: OrphanReport['orphanFiles'] = [];
		let totalOrphanBytes = 0;

		for (const f of files) {
			if (!refKeys.has(f.key.toLowerCase())) {
				orphanFiles.push({
					key: f.key,
					folder: f.folder,
					fileName: f.fileName,
					sizeBytes: f.sizeBytes,
					updatedAt: f.updatedAt
				});
				totalOrphanBytes += f.sizeBytes;
			}
		}

		return {
			totalOrphans: orphanFiles.length,
			totalOrphanBytes,
			orphanFiles
		};
	},

	/**
	 * Get complete storage overview and R2 backup state
	 */
	async getStorageOverview(): Promise<StorageOverview> {
		const baseDir = getUploadBaseDir();
		const files = scanDirFiles(baseDir);

		const folderStats: Record<string, { bytes: number; count: number }> = {
			materials: { bytes: 0, count: 0 },
			avatars: { bytes: 0, count: 0 },
			submissions: { bytes: 0, count: 0 },
			attachments: { bytes: 0, count: 0 }
		};

		let totalBytes = 0;
		for (const f of files) {
			totalBytes += f.sizeBytes;
			if (folderStats[f.folder]) {
				folderStats[f.folder].bytes += f.sizeBytes;
				folderStats[f.folder].count += 1;
			}
		}

		const orphanReport = await this.getOrphanReport();

		const r2AccountId = privateEnv.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || null;
		const r2BucketName = privateEnv.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || null;
		const hasR2Config = Boolean(
			r2AccountId &&
				(privateEnv.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID) &&
				r2BucketName
		);

		return {
			activeBaseDir: baseDir,
			totalBytes,
			totalFiles: files.length,
			folderStats,
			r2Backup: {
				isConfigured: hasR2Config,
				bucketName: r2BucketName,
				accountId: r2AccountId
			},
			orphanStats: {
				orphanCount: orphanReport.totalOrphans,
				orphanBytes: orphanReport.totalOrphanBytes
			}
		};
	},

	/**
	 * Clean up orphan files from disk
	 */
	async cleanOrphanFiles(actorId: number, keysToDelete?: string[]): Promise<{ success: boolean; deletedCount: number; freedBytes: number; message: string }> {
		const baseDir = getUploadBaseDir();
		const report = await this.getOrphanReport();

		const targets = keysToDelete && keysToDelete.length > 0
			? report.orphanFiles.filter((o) => keysToDelete.includes(o.key))
			: report.orphanFiles;

		let deletedCount = 0;
		let freedBytes = 0;

		for (const target of targets) {
			const fullPath = path.join(baseDir, target.folder, target.fileName);
			if (fs.existsSync(fullPath)) {
				try {
					fs.unlinkSync(fullPath);
					deletedCount += 1;
					freedBytes += target.sizeBytes;
				} catch (e) {
					console.error(`Failed deleting orphan file ${fullPath}:`, e);
				}
			}
		}

		await AuditLogService.logAction({
			actorId,
			action: 'CLEAN_ORPHAN_FILES',
			entityType: 'storage',
			newValues: {
				deletedCount,
				freedBytes,
				freedMB: (freedBytes / (1024 * 1024)).toFixed(2)
			}
		});

		return {
			success: true,
			deletedCount,
			freedBytes,
			message: `Berhasil menghapus ${deletedCount} file orphan dan membebaskan ${(freedBytes / (1024 * 1024)).toFixed(2)} MB ruang penyimpanan.`
		};
	},

	/**
	 * Sync local upload volume files to Cloudflare R2 Cloud
	 */
	async syncLocalVolumeToR2(actorId: number): Promise<{ success: boolean; syncedCount: number; failedCount: number; totalBytesSynced: number; message: string }> {
		const r2AccountId = privateEnv.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
		const r2AccessKeyId = privateEnv.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
		const r2SecretAccessKey = privateEnv.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
		const r2BucketName = privateEnv.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;

		if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
			return {
				success: false,
				syncedCount: 0,
				failedCount: 0,
				totalBytesSynced: 0,
				message: 'Kredensial Cloudflare R2 belum dikonfigurasi pada environment server.'
			};
		}

		const baseDir = getUploadBaseDir();
		const files = scanDirFiles(baseDir);

		let syncedCount = 0;
		let failedCount = 0;
		let totalBytesSynced = 0;

		for (const file of files) {
			try {
				const buffer = fs.readFileSync(file.fullPath);
				const r2Url = `https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com/${file.key}`;

				const resp = await fetch(r2Url, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/octet-stream'
					},
					body: new Uint8Array(buffer)
				});

				if (resp.ok) {
					syncedCount += 1;
					totalBytesSynced += file.sizeBytes;
				} else {
					failedCount += 1;
				}
			} catch (err) {
				console.error(`Error uploading ${file.key} to R2:`, err);
				failedCount += 1;
			}
		}

		await AuditLogService.logAction({
			actorId,
			action: 'SYNC_R2_BACKUP',
			entityType: 'storage',
			newValues: {
				syncedCount,
				failedCount,
				totalBytesSynced,
				bucketName: r2BucketName
			}
		});

		return {
			success: true,
			syncedCount,
			failedCount,
			totalBytesSynced,
			message: `Sinkronisasi selesai! ${syncedCount} file (${(totalBytesSynced / (1024 * 1024)).toFixed(2)} MB) berhasil dicadangkan ke R2 Cloud.${failedCount > 0 ? ` (${failedCount} file gagal)` : ''}`
		};
	}
};
