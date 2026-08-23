import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

const MIME_TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.ppt': 'application/vnd.ms-powerpoint',
	'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.txt': 'text/plain',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.zip': 'application/zip',
	'.rar': 'application/x-rar-compressed',
	'.7z': 'application/x-7z-compressed',
	'.pkt': 'application/octet-stream',
	'.gns3': 'application/octet-stream',
	'.pcap': 'application/vnd.tcpdump.pcap',
	'.pcapng': 'application/x-pcapng'
};

export const GET: RequestHandler = async ({ params }) => {
	const relPath = params.path;
	if (!relPath) {
		throw error(404, 'File tidak ditemukan');
	}

	// Sanitasi path untuk mencegah Vulnerability Path Traversal (../../)
	const safeRelative = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');

	// Cek lokasi direktori penyimpanan yang mungkin
	const possiblePaths: string[] = [];
	if (process.env.UPLOADS_DIR) {
		possiblePaths.push(path.join(process.env.UPLOADS_DIR, safeRelative));
	}
	possiblePaths.push(path.join(process.cwd(), 'static', 'uploads', safeRelative));
	possiblePaths.push(path.join(process.cwd(), 'uploads', safeRelative));
	possiblePaths.push(path.join(process.cwd(), 'build', 'client', 'uploads', safeRelative));

	let targetFile: string | null = null;
	for (const p of possiblePaths) {
		if (fs.existsSync(p) && fs.statSync(p).isFile()) {
			targetFile = p;
			break;
		}
	}

	if (!targetFile) {
		throw error(404, 'File tidak ditemukan');
	}

	const ext = path.extname(targetFile).toLowerCase();
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	const fileStream = fs.createReadStream(targetFile);

	return new Response(fileStream as any, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
