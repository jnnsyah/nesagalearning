import sharp from 'sharp';
import path from 'path';

export interface CompressionResult {
	buffer: Buffer;
	ext: string;
	mimeType: string;
	originalSize: number;
	compressedSize: number;
	savedBytes: number;
	savedPercentage: number;
	isCompressed: boolean;
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff']);

/**
 * Backend File Compression Engine — Uses sharp (libvips) for high-performance image compression & WebP conversion.
 */
export async function compressImageBuffer(
	buffer: Buffer,
	ext: string,
	folder: string = 'materials'
): Promise<CompressionResult> {
	const originalSize = buffer.length;
	const normalizedExt = ext.toLowerCase().trim();

	// If file is not a compressible image (e.g. PDF, ZIP, GIF, DOCX), return uncompressed
	if (!IMAGE_EXTENSIONS.has(normalizedExt)) {
		return {
			buffer,
			ext: normalizedExt,
			mimeType: getMimeType(normalizedExt),
			originalSize,
			compressedSize: originalSize,
			savedBytes: 0,
			savedPercentage: 0,
			isCompressed: false
		};
	}

	try {
		const isAvatar = folder === 'avatars';
		let pipeline = sharp(buffer);

		// Rotate image based on EXIF orientation (e.g. mobile photos taken vertically)
		pipeline = pipeline.rotate();

		if (isAvatar) {
			// Avatar profile photos: square crop 400x400, high quality WebP
			pipeline = pipeline
				.resize(400, 400, {
					fit: 'cover',
					position: 'center',
					withoutEnlargement: true
				})
				.webp({ quality: 82, effort: 4 });
		} else {
			// Material & submission images: max width/height 1920px, high quality WebP
			pipeline = pipeline
				.resize(1920, 1920, {
					fit: 'inside',
					withoutEnlargement: true
				})
				.webp({ quality: 82, effort: 4 });
		}

		const compressedBuffer = await pipeline.toBuffer();
		const compressedSize = compressedBuffer.length;

		// Only use compressed buffer if it actually saved space
		if (compressedSize < originalSize) {
			const savedBytes = originalSize - compressedSize;
			const savedPercentage = Math.round((savedBytes / originalSize) * 100);

			return {
				buffer: compressedBuffer,
				ext: '.webp',
				mimeType: 'image/webp',
				originalSize,
				compressedSize,
				savedBytes,
				savedPercentage,
				isCompressed: true
			};
		}
	} catch (err) {
		console.warn('Backend image compression fallback (failed to process buffer):', err);
	}

	// Fallback if compression fails or result wasn't smaller
	return {
		buffer,
		ext: normalizedExt,
		mimeType: getMimeType(normalizedExt),
		originalSize,
		compressedSize: originalSize,
		savedBytes: 0,
		savedPercentage: 0,
		isCompressed: false
	};
}

function getMimeType(ext: string): string {
	switch (ext) {
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg';
		case '.png':
			return 'image/png';
		case '.webp':
			return 'image/webp';
		case '.gif':
			return 'image/gif';
		case '.pdf':
			return 'application/pdf';
		case '.zip':
			return 'application/zip';
		case '.docx':
			return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		case '.pptx':
			return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
		case '.xlsx':
			return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		default:
			return 'application/octet-stream';
	}
}
