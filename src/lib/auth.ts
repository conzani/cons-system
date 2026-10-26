import { prisma } from './db';
import type { Prisma } from '@prisma/client';
import { hash, compare } from 'bcrypt';

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

/**
 * Constant-cost comparison target so a missing account takes about as long to
 * reject as a wrong password (limits user enumeration by timing).
 */
const DUMMY_PASSWORD_HASH = '$2b$10$07cbnJOoYSPLCgJZ1MFJveF231.avUS8E86B1n4VPTBHQnnf7Sui2';

const sessionUserInclude = {
	role: {
		include: {
			rolesPermissions: { include: { permission: true } }
		}
	},
	userRoles: {
		include: {
			role: {
				include: {
					rolesPermissions: { include: { permission: true } }
				}
			}
		}
	},
	department: { select: { id: true, name: true } },
	branch: { select: { id: true, name: true } }
} satisfies Prisma.UserInclude;

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof sessionUserInclude }>;

function collectPermissions(user: UserWithAccess): string[] {
	const names = new Set<string>();
	for (const rp of user.role.rolesPermissions) names.add(rp.permission.name);
	for (const assigned of user.userRoles) {
		for (const rp of assigned.role.rolesPermissions) names.add(rp.permission.name);
	}
	return [...names];
}

function toSessionUser(user: UserWithAccess): SessionUser {
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
		permissions: collectPermissions(user)
	};
}

export async function hashPassword(password: string): Promise<string> {
	return await hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	return await compare(password, hashedPassword);
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
	const normalizedEmail = email.trim().toLowerCase();
	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		include: sessionUserInclude
	});

	if (!user) {
		// Burn the same amount of time as a real password check.
		await compare(password, DUMMY_PASSWORD_HASH);
		return null;
	}

	if (user.deletedAt) return null;
	if (user.status && user.status.toLowerCase() !== 'active') return null;

	const isValid = await compare(password, user.password);
	if (!isValid) return null;

	return toSessionUser(user);
}

export async function getUserById(id: bigint | number): Promise<SessionUser | null> {
	const userId = typeof id === 'bigint' ? id : BigInt(id);
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: sessionUserInclude
	});

	if (!user || user.deletedAt) return null;
	if (user.status && user.status.toLowerCase() !== 'active') return null;

	return toSessionUser(user);
}

export function hasPermission(user: SessionUser, permission: string): boolean {
	return user.permissions.includes(permission);
}

export function hasAnyPermission(user: SessionUser, permissions: string[]): boolean {
	return permissions.some((permission) => user.permissions.includes(permission));
}

export function hasAllPermissions(user: SessionUser, permissions: string[]): boolean {
	return permissions.every((permission) => user.permissions.includes(permission));
}
