import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') {
		return obj.toString();
	}
	if (obj instanceof Date) {
		return obj.toISOString();
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
		const departments = await prisma.department.findMany({
			where: { deletedAt: null },
			include: {
				branch: true
			},
			orderBy: { name: 'asc' }
		});
		return json(serializeBigInt(departments));
	} catch (error) {
		console.error('Error fetching departments:', error);
		return json({ error: 'Failed to fetch departments' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const { name, type, branchId } = await request.json();

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const data: any = {
			publicId: generatePublicId(),
			name,
			type: type || null
		};

		if (branchId) {
			data.branchId = BigInt(branchId);
		}

		const department = await prisma.department.create({
			data
		});

		return json(serializeBigInt(department), { status: 201 });
	} catch (error) {
		console.error('Error creating department:', error);
		return json({ error: 'Failed to create department' }, { status: 500 });
	}
}
