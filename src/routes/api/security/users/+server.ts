import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import bcrypt from 'bcrypt';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') {
		return obj.toString();
	}
	if (Array.isArray(obj)) {
		return obj.map(serializeBigInt);
	}
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

/** Never expose the password hash, even to administrators. */
const publicUserSelect = {
	id: true,
	publicId: true,
	firstname: true,
	lastname: true,
	email: true,
	phone: true,
	status: true,
	roleId: true,
	departmentId: true,
	branchId: true,
	createdAt: true,
	updatedAt: true,
	role: true,
	department: { select: { id: true, name: true } },
	branch: { select: { id: true, name: true } }
} as const;

export async function GET() {
	try {
		const users = await prisma.user.findMany({
			where: { deletedAt: null },
			select: publicUserSelect,
			orderBy: { createdAt: 'desc' }
		});
		return json(serializeBigInt(users));
	} catch (error) {
		console.error('Error fetching users:', error);
		return json({ error: 'Failed to fetch users' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const { firstname, lastname, email, password, roleId, departmentId, branchId } =
			await request.json();

		if (!firstname || !lastname || !email || !password || !roleId) {
			return json(
				{ error: 'First name, last name, email, password, and role are required' },
				{ status: 400 }
			);
		}

		if (typeof password !== 'string' || password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
			return json({ error: 'Enter a valid email address' }, { status: 400 });
		}

		const role = await prisma.role.findFirst({
			where: { id: BigInt(roleId), deletedAt: null },
			select: { id: true }
		});
		if (!role) {
			return json({ error: 'Selected role does not exist' }, { status: 400 });
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const data: any = {
			publicId: generatePublicId(),
			firstname: String(firstname).trim(),
			lastname: String(lastname).trim(),
			email: String(email).trim().toLowerCase(),
			password: hashedPassword,
			roleId: role.id,
			status: 'active'
		};

		if (departmentId) data.departmentId = BigInt(departmentId);
		if (branchId) data.branchId = BigInt(branchId);

		const user = await prisma.user.create({
			data,
			select: publicUserSelect
		});

		return json(serializeBigInt(user), { status: 201 });
	} catch (error) {
		console.error('Error creating user:', error);
		return json({ error: 'Failed to create user' }, { status: 500 });
	}
}
