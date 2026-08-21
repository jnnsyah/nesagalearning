/**
 * File & URL Sanitization Utilities for NLC Attachments & User Uploads
 */

// Dangerous file extensions blocked for security (executable, scripts, web shells)
const BLOCKED_EXTENSIONS = new Set([
	'.exe', '.bat', '.cmd', '.sh', '.bash', '.zsh', '.ps1', '.vbs',
	'.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.phar',
	'.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
	'.html', '.htm', '.xhtml', '.shtml', '.pl', '.py', '.rb', '.cgi',
	'.dll', '.so', '.dylib', '.scr', '.com', '.jar', '.apk', '.asp', '.aspx', '.jsp'
]);

// Allowed safe extensions for attachments
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
	// Documents & Text
	'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.rtf',
	// Lab Topologies & Network Configurations
	'.pkt', '.gns3', '.pcap', '.pcapng', '.json', '.yaml', '.yml', '.conf', '.cfg', '.log',
	// Archives
	'.zip', '.rar', '.7z', '.tar', '.gz',
	// Images & Media
	'.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mp3'
]);

/**
 * Sanitizes a raw filename to prevent directory traversal, double extensions, control characters, and unsafe symbols.
 */
export function sanitizeFilename(originalName: string): string {
	if (!originalName || typeof originalName !== 'string') {
		return 'attachment';
	}

	// 1. Remove path information (directory traversal prevention)
	let cleanName = originalName.replace(/^.*[\\/]/, '').trim();

	// 2. Remove null bytes and control characters
	cleanName = cleanName.replace(/[\x00-\x1f\x7f]/g, '');

	// 3. Extract extension and base name
	const lastDotIndex = cleanName.lastIndexOf('.');
	if (lastDotIndex === -1) {
		// No extension
		return cleanName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100) || 'attachment';
	}

	let baseName = cleanName.substring(0, lastDotIndex);
	let ext = cleanName.substring(lastDotIndex).toLowerCase();

	// If extension is blocked, append .txt safely
	if (BLOCKED_EXTENSIONS.has(ext)) {
		ext = '.txt';
	}

	// Sanitize base name (alphanumeric, hyphens, underscores)
	baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').substring(0, 100);
	if (!baseName) baseName = 'attachment';

	return `${baseName}${ext}`;
}

/**
 * Validates whether a file extension is allowed for attachments.
 */
export function isAllowedAttachmentExtension(filename: string): boolean {
	if (!filename) return false;
	const clean = filename.toLowerCase().trim();
	const lastDot = clean.lastIndexOf('.');
	if (lastDot === -1) return false;
	const ext = clean.substring(lastDot);
	return ALLOWED_ATTACHMENT_EXTENSIONS.has(ext) && !BLOCKED_EXTENSIONS.has(ext);
}

/**
 * Sanitizes URLs to prevent XSS (javascript:, data:text/html, etc.).
 * Only allows http://, https://, or relative /uploads/ URLs.
 */
export function sanitizeUrl(rawUrl: string): string {
	if (!rawUrl || typeof rawUrl !== 'string') return '';
	const url = rawUrl.trim();

	if (url.startsWith('/uploads/')) {
		return url.replace(/[^a-zA-Z0-9/._-]/g, '');
	}

	try {
		const parsed = new URL(url);
		if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
			return parsed.href;
		}
	} catch {
		return '';
	}

	return '';
}

/**
 * Formats file size in bytes to human readable format (KB, MB).
 */
export function formatFileSize(bytes: number): string {
	if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
