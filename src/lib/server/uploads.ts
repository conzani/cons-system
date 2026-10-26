/**
 * Upload safety rules for the document management system.
 * Construction files (drawings, BOQs, contracts, site photos) plus common office formats.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
	// Documents
	'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'rtf', 'odt', 'ods', 'odp',
	// Images
	'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic',
	// Construction / CAD
	'dwg', 'dxf', 'ifc', 'dgn', 'rvt',
	// Archives
	'zip', 'rar', '7z'
]);

/** MIME types that are safe to render inline in the browser. Everything else downloads. */
const INLINE_SAFE_MIME = new Set([
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp'
]);

export function extensionOf(fileName: string): string {
	const parts = fileName.split('.');
	return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/** Returns an error message, or null when the upload is acceptable. */
export function validateUpload(file: File): string | null {
	if (!file || typeof file.name !== 'string' || file.name.length === 0) {
		return 'A file is required';
	}
	if (file.name.length > 255) return 'File name is too long';
	if (file.size <= 0) return 'The uploaded file is empty';
	if (file.size > MAX_UPLOAD_BYTES) {
		return `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`;
	}
	if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) {
		return `File type ".${extensionOf(file.name)}" is not allowed`;
	}
	return null;
}

/** Strips characters that could break out of the Content-Disposition header. */
export function sanitizeFileName(fileName: string): string {
	const cleaned = fileName
		.replace(/[\r\n"\\/]/g, '_')
		.replace(/[^\x20-\x7E]/g, '_')
		.trim()
		.slice(0, 180);
	return cleaned.length > 0 ? cleaned : 'download';
}

export function isInlineSafe(mimeType: string | null | undefined): boolean {
	return !!mimeType && INLINE_SAFE_MIME.has(mimeType);
}

export function contentDisposition(
	type: 'inline' | 'attachment',
	fileName: string
): string {
	const ascii = sanitizeFileName(fileName);
	const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (c) =>
		`%${c.charCodeAt(0).toString(16).toUpperCase()}`
	);
	return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
