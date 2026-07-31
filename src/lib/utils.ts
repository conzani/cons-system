import crypto from 'crypto';

export function generatePublicId(): string {
	// Generate UUID and take first 12 characters
	return crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
}
