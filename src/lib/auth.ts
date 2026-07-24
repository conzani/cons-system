import { prisma } from './db';
import type { User, Role, Permission } from '@prisma/client';
import { hash, compare } from 'bcrypt';

export type UserWithRoles = User & {
	role: Role;
	department?: { id: bigint; name: string } | null;
	branch?: { id: bigint; name: string } | null;
};

export type SessionUser = {
	id: bigint;
	publicId: string;
	email: string;
	firstname: string;
	lastname: string;
	roleId: bigint;
	roleName: string;
	departmentId?: bigint;
	branchId?: bigint;
	permissions: string[];
};

export async function hashPassword(password: string): Promise<string> {
	return await hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	return await compare(password, hashedPassword);
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
	const user = await prisma.user.findUnique({
		where: { email },
		include: {
			role: {
				include: {
					rolesPermissions: {
						include: {
							permission: true
						}
					}
				}
			},
			department: {
				select: {
					id: true,
					name: true
				}
			},
			branch: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	if (!user) return null;

	const isValid = await verifyPassword(password, user.password);
	if (!isValid) return null;

	if (user.deletedAt) return null;

	const permissions = user.role.rolesPermissions.map(rp => rp.permission.name);

	return {
		id: user.id,
		publicId: user.publicId,
		email: user.email,
		firstname: user.firstname,
		lastname: user.lastname,
		roleId: user.roleId,
		roleName: user.role.name,
		departmentId: user.departmentId ?? undefined,
		branchId: user.branchId ?? undefined,
		permissions
	};
}

export async function getUserById(id: number): Promise<SessionUser | null> {
	const user = await prisma.user.findUnique({
		where: { id },
		include: {
			role: {
				include: {
					rolesPermissions: {
						include: {
							permission: true
						}
					}
				}
			},
			department: {
				select: {
					id: true,
					name: true
				}
			},
			branch: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	if (!user || user.deletedAt) return null;

	const permissions = user.role.rolesPermissions.map(rp => rp.permission.name);

	return {
		id: user.id,
		publicId: user.publicId,
		email: user.email,
		firstname: user.firstname,
		lastname: user.lastname,
		roleId: user.roleId,
		roleName: user.role.name,
		departmentId: user.departmentId ?? undefined,
		branchId: user.branchId ?? undefined,
		permissions
	};
}

export function hasPermission(user: SessionUser, permission: string): boolean {
	return user.permissions.includes(permission);
}

export function hasAnyPermission(user: SessionUser, permissions: string[]): boolean {
	return permissions.some(p => user.permissions.includes(p));
}

export function hasAllPermissions(user: SessionUser, permissions: string[]): boolean {
	return permissions.every(p => user.permissions.includes(p));
}
