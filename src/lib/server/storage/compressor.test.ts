import { describe, it, expect } from 'vitest';
import { compressImageBuffer } from './compressor';

describe('Backend File Compression Engine', () => {
	it('should pass through non-compressible document files without changes', async () => {
		const pdfBuffer = Buffer.from('%PDF-1.4 dummy pdf content for testing');
		const result = await compressImageBuffer(pdfBuffer, '.pdf', 'materials');

		expect(result.isCompressed).toBe(false);
		expect(result.ext).toBe('.pdf');
		expect(result.originalSize).toBe(pdfBuffer.length);
		expect(result.compressedSize).toBe(pdfBuffer.length);
	});

	it('should compress a raw uncompressed image buffer into WebP format', async () => {
		// Generate an uncompressed 100x100 PNG buffer using sharp
		const sharp = (await import('sharp')).default;
		const rawBuffer = await sharp({
			create: {
				width: 500,
				height: 500,
				channels: 4 as const,
				background: { r: 79, g: 70, b: 229, alpha: 1 }
			}
		})
			.png({ compressionLevel: 0 })
			.toBuffer();

		const result = await compressImageBuffer(rawBuffer, '.png', 'avatars');

		expect(result.isCompressed).toBe(true);
		expect(result.ext).toBe('.webp');
		expect(result.mimeType).toBe('image/webp');
		expect(result.compressedSize).toBeLessThan(result.originalSize);
		expect(result.savedPercentage).toBeGreaterThan(0);
	});
});
