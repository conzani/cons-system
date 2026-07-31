import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
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

export async function PUT({ request, params }: RequestEvent) {
	try {
		const { name, description, location } = await request.json();
		
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const branch = await prisma.branch.update({
			where: { id },
			data: {
				name,
				description: description || null,
				location: location || null
			}
		});

		return json(serializeBigInt(branch));
	} catch (error) {
		console.error('Error updating branch:', error);
		return json({ error: 'Failed to update branch' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);

		await prisma.branch.delete({
			where: { id }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting branch:', error);
		return json({ error: 'Failed to delete branch' }, { status: 500 });
	}
}
