import { prisma } from '$lib/db';

/** Current stock per item, summed across all warehouses. */
export async function stockLevels(): Promise<Map<string, number>> {
	const movements = await prisma.stockMovement.groupBy({
		by: ['itemId', 'type'],
		_sum: { quantity: true }
	});

	const levels = new Map<string, number>();
	for (const row of movements) {
		const key = row.itemId.toString();
		const sign = row.type === 'Out' ? -1 : 1;
		levels.set(key, (levels.get(key) ?? 0) + sign * Number(row._sum.quantity ?? 0));
	}
	return levels;
}

/** Stock per item for a single warehouse. */
export async function stockByWarehouse(warehouseId: bigint): Promise<Map<string, number>> {
	const movements = await prisma.stockMovement.groupBy({
		by: ['itemId', 'type'],
		where: { warehouseId },
		_sum: { quantity: true }
	});

	const levels = new Map<string, number>();
	for (const row of movements) {
		const key = row.itemId.toString();
		const sign = row.type === 'Out' ? -1 : 1;
		levels.set(key, (levels.get(key) ?? 0) + sign * Number(row._sum.quantity ?? 0));
	}
	return levels;
}
