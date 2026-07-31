import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
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
