import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';
import { postManualStockIn, postStockIssue } from '$lib/server/finance';

const toBigInt = (value: unknown) => {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
	if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
	return null;
};

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

async function balanceFor(itemId: bigint, warehouseId: bigint) {
	const [inbound, outbound] = await Promise.all([
		prisma.stockMovement.aggregate({
			where: { itemId, warehouseId, type: 'In' },
			_sum: { quantity: true }
		}),
		prisma.stockMovement.aggregate({
			where: { itemId, warehouseId, type: 'Out' },
			_sum: { quantity: true }
		})
	]);
	return Number(inbound._sum.quantity ?? 0) - Number(outbound._sum.quantity ?? 0);
}

export async function GET({ url }: RequestEvent) {
	try {
		const itemId = url.searchParams.get('itemId');
		const projectId = url.searchParams.get('projectId');
		const movements = await prisma.stockMovement.findMany({
			where: {
				...(itemId ? { itemId: BigInt(itemId) } : {}),
				...(projectId ? { projectId: BigInt(projectId) } : {})
			},
			include: {
				item: { select: { id: true, name: true, unit: true, code: true } },
				warehouse: { select: { id: true, name: true } }
			},
			orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
			take: 200
		});
		return json({ success: true, data: serializeBigInt(movements) });
	} catch (error) {
		console.error('Error fetching stock movements:', error);
		return json({ success: false, error: 'Failed to fetch stock movements' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const itemId = toBigInt(body.itemId);
		const warehouseId = toBigInt(body.warehouseId);
		const quantity = Number(body.quantity ?? 0);
		const type = text(body.type) ?? 'Out';

		if (!itemId || !warehouseId) {
			return json({ success: false, error: 'Item and warehouse are required' }, { status: 400 });
		}
		if (quantity <= 0) {
			return json({ success: false, error: 'Quantity must be positive' }, { status: 400 });
		}
		if (!['In', 'Out'].includes(type)) {
			return json({ success: false, error: 'Movement type must be In or Out' }, { status: 400 });
		}

		const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, deletedAt: null } });
		if (!item) return json({ success: false, error: 'Inventory item not found' }, { status: 404 });

		if (type === 'Out') {
			const available = await balanceFor(itemId, warehouseId);
			if (quantity > available) {
				return json(
					{ success: false, error: `Insufficient stock. Available: ${available} ${item.unit}` },
					{ status: 400 }
				);
			}
		}

		const unitCost =
			body.unitCost !== undefined && body.unitCost !== ''
				? Math.round(Number(body.unitCost))
				: Number(item.unitCost);

		const movement = await prisma.stockMovement.create({
			data: {
				publicId: generatePublicId(),
				itemId,
				warehouseId,
				type,
				quantity,
				unitCost: BigInt(unitCost),
				movementDate: body.movementDate ? new Date(body.movementDate) : new Date(),
				projectId: toBigInt(body.projectId),
				siteId: toBigInt(body.siteId),
				notes: text(body.notes),
				createdBy: locals.user?.id,
				referenceType: 'Manual'
			},
			include: {
				item: { select: { id: true, name: true, unit: true, code: true } },
				warehouse: { select: { id: true, name: true } }
			}
		});

		if (type === 'Out') {
			await postStockIssue(movement.id, {
				itemName: item.name,
				quantity,
				unitCost,
				projectId: movement.projectId,
				siteId: movement.siteId
			});
		} else {
			await postManualStockIn(movement.id, {
				itemName: item.name,
				quantity,
				unitCost
			});
			if (unitCost > 0) {
				await prisma.inventoryItem.update({ where: { id: itemId }, data: { unitCost: BigInt(unitCost) } });
			}
		}

		return json({ success: true, data: serializeBigInt(movement) }, { status: 201 });
	} catch (error) {
		console.error('Error creating stock movement:', error);
		return json({ success: false, error: 'Failed to create stock movement' }, { status: 500 });
	}
}
