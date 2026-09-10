import { json, type RequestHandler } from '@sveltejs/kit';

function extractYouTubeId(url: string): string | null {
	if (!url) return null;
	const trimmed = url.trim();
	const patterns = [
		(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i)
	];
	for (const pattern of patterns) {
		const match = trimmed.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}
	return null;
}

function parseIsoDuration(durationStr: string): string {
	// ISO 8601 duration format: PT#H#M#S or PT#M#S or PT#S
	const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
	if (!match) return '';
	const hours = parseInt(match[1] || '0', 10);
	const minutes = parseInt(match[2] || '0', 10);
	const seconds = parseInt(match[3] || '0', 10);

	const pad = (num: number) => num.toString().padStart(2, '0');

	if (hours > 0) {
		return `${hours}:${pad(minutes)}:${pad(seconds)}`;
	}
	return `${minutes}:${pad(seconds)}`;
}

function formatSeconds(secondsNum: number): string {
	if (isNaN(secondsNum) || secondsNum <= 0) return '';
	const hours = Math.floor(secondsNum / 3600);
	const minutes = Math.floor((secondsNum % 3600) / 60);
	const seconds = secondsNum % 60;
	const pad = (num: number) => num.toString().padStart(2, '0');

	if (hours > 0) {
		return `${hours}:${pad(minutes)}:${pad(seconds)}`;
	}
	return `${minutes}:${pad(seconds)}`;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Akses ditolak' }, { status: 401 });
	}

	const targetUrl = url.searchParams.get('url') || '';
	const youtubeId = extractYouTubeId(targetUrl);

	if (!youtubeId) {
		return json(
			{ error: 'Format URL YouTube tidak valid. Gunakan format seperti https://www.youtube.com/watch?v=...' },
			{ status: 400 }
		);
	}

	try {
		// 1. Fetch title via YouTube oEmbed API
		const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
		const oembedRes = await fetch(oembedUrl, {
			headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
			signal: AbortSignal.timeout(5000)
		});

		if (!oembedRes.ok) {
			if (oembedRes.status === 404 || oembedRes.status === 403) {
				return json(
					{ error: 'Video YouTube tidak ditemukan, berstatus privat, atau telah dihapus/diarsip oleh pemiliknya.' },
					{ status: 404 }
				);
			}
			return json(
				{ error: 'Gagal mengambil informasi video dari YouTube. Pastikan link video dapat diakses publik.' },
				{ status: 400 }
			);
		}

		const oembedData = await oembedRes.json();
		const title = oembedData.title || 'Video YouTube';

		// 2. Fetch duration from watch HTML metadata
		let duration = '';
		try {
			const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
			const watchRes = await fetch(watchUrl, {
				headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
				signal: AbortSignal.timeout(4000)
			});
			if (watchRes.ok) {
				const html = await watchRes.text();
				const isoMatch = html.match(/itemprop="duration" content="([^"]+)"/i);
				if (isoMatch && isoMatch[1]) {
					duration = parseIsoDuration(isoMatch[1]);
				}
				if (!duration) {
					const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
					if (lenMatch && lenMatch[1]) {
						duration = formatSeconds(parseInt(lenMatch[1], 10));
					}
				}
			}
		} catch (e) {
			console.warn('Failed to parse YouTube duration:', e);
		}

		return json({
			success: true,
			youtubeId,
			title,
			duration: duration || 'Video',
			url: `https://www.youtube.com/watch?v=${youtubeId}`,
			thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
		});
	} catch (err: any) {
		console.error('YouTube info fetch error:', err);
		return json(
			{ error: 'Gagal terhubung ke layanan YouTube. Periksa kembali jaringan Anda.' },
			{ status: 500 }
		);
	}
};
