import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';
import { stockLevels } from '$lib/server/inventory';

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export async function GET() {
	try {
		const [items, levels] = await Promise.all([
			prisma.inventoryItem.findMany({
				where: { deletedAt: null },
				orderBy: { name: 'asc' }
			}),
			stockLevels()
		]);

		const data = items.map((item) => ({
			...item,
			stock: levels.get(item.id.toString()) ?? 0
		}));

		return json({ success: true, data: serializeBigInt(data) });
	} catch (error) {
		console.error('Error fetching inventory items:', error);
		return json({ success: false, error: 'Failed to fetch inventory items' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const name = text(body.name);
		if (!name) return json({ success: false, error: 'Item name is required' }, { status: 400 });

		const code = text(body.code) ?? `MAT-${Date.now().toString().slice(-8)}`;
		const item = await prisma.inventoryItem.create({
			data: {
				publicId: generatePublicId(),
				code,
				name,
				category: text(body.category),
				unit: text(body.unit) ?? 'units',
				unitCost: BigInt(Math.round(Number(body.unitCost ?? 0))),
				reorderLevel: Number(body.reorderLevel ?? 0),
				status: 'Active'
			}
		});

		return json({ success: true, data: serializeBigInt(item) }, { status: 201 });
	} catch (error) {
		console.error('Error creating inventory item:', error);
		return json({ success: false, error: 'Failed to create inventory item' }, { status: 500 });
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'id is required' }, { status: 400 });

		const item = await prisma.inventoryItem.update({
			where: { id: BigInt(body.id) },
			data: {
				name: text(body.name) ?? undefined,
				category: text(body.category),
				unit: text(body.unit) ?? undefined,
				unitCost: body.unitCost !== undefined ? BigInt(Math.round(Number(body.unitCost))) : undefined,
				reorderLevel: body.reorderLevel !== undefined ? Number(body.reorderLevel) : undefined,
				status: text(body.status) ?? undefined
			}
		});

		return json({ success: true, data: serializeBigInt(item) });
	} catch (error) {
		console.error('Error updating inventory item:', error);
		return json({ success: false, error: 'Failed to update inventory item' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.inventoryItem.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date(), status: 'Inactive' }
		});
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting inventory item:', error);
		return json({ success: false, error: 'Failed to delete inventory item' }, { status: 500 });
	}
}
