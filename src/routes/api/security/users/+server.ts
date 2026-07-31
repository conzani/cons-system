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

export async function GET() {
	try {
		const users = await prisma.user.findMany({
			include: {
				role: true,
				department: true,
				branch: true
			}
		});
		return json(serializeBigInt(users));
	} catch (error) {
		console.error('Error fetching users:', error);
		return json({ error: 'Failed to fetch users' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const { firstname, lastname, email, password, roleId, departmentId, branchId } = await request.json();

		if (!firstname || !lastname || !email || !password || !roleId) {
			return json({ error: 'First name, last name, email, password, and role are required' }, { status: 400 });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const data: any = {
			publicId: generatePublicId(),
			firstname,
			lastname,
			email,
			password: hashedPassword,
			roleId: BigInt(roleId),
			status: 'active'
		};

		if (departmentId) {
			data.departmentId = BigInt(departmentId);
		}
		if (branchId) {
			data.branchId = BigInt(branchId);
		}

		const user = await prisma.user.create({
			data,
			include: {
				role: true,
				department: true,
				branch: true
			}
		});

		return json(serializeBigInt(user), { status: 201 });
	} catch (error) {
		console.error('Error creating user:', error);
		return json({ error: 'Failed to create user' }, { status: 500 });
	}
}
