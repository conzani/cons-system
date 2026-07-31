export function generatePublicId(): string {
	return Math.random().toString(36).substring(2, 14).toUpperCase();
}
