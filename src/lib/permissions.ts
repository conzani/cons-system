/** Client-safe permission check. */
export function can(permissions: string[] | null | undefined, permission: string): boolean {
	return !!permissions?.includes(permission);
}

export function canAny(permissions: string[] | null | undefined, required: string[]): boolean {
	return !!permissions && required.some((permission) => permissions.includes(permission));
}
