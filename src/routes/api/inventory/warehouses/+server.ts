import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export async function GET() {
	try {
		const warehouses = await prisma.warehouse.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		});
		return json({ success: true, data: serializeBigInt(warehouses) });
	} catch (error) {
		console.error('Error fetching warehouses:', error);
		return json({ success: false, error: 'Failed to fetch warehouses' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const name = text(body.name);
		if (!name) return json({ success: false, error: 'Warehouse name is required' }, { status: 400 });

		const warehouse = await prisma.warehouse.create({
			data: {
				publicId: generatePublicId(),
				name,
				location: text(body.location),
				projectId: body.projectId ? BigInt(body.projectId) : null,
				siteId: body.siteId ? BigInt(body.siteId) : null
			}
		});

		return json({ success: true, data: serializeBigInt(warehouse) }, { status: 201 });
	} catch (error) {
		console.error('Error creating warehouse:', error);
		return json({ success: false, error: 'Failed to create warehouse' }, { status: 500 });
	}
}
