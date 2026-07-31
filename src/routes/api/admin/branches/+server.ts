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
		const { name, description, location } = await request.json();

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const branch = await prisma.branch.create({
			data: {
				publicId: generatePublicId(),
				name,
				description: description || null,
				location: location || null
			}
		});

		return json(serializeBigInt(branch), { status: 201 });
	} catch (error) {
		console.error('Error creating branch:', error);
		return json({ error: 'Failed to create branch' }, { status: 500 });
	}
}
