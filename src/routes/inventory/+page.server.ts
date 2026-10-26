import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import { stockLevels } from '$lib/server/inventory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [items, levels, warehouses, movements, projects, sites] = await Promise.all([
		prisma.inventoryItem.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
		stockLevels(),
		prisma.warehouse.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
		prisma.stockMovement.findMany({
			include: {
				item: { select: { id: true, name: true, unit: true, code: true } },
				warehouse: { select: { id: true, name: true } }
			},
			orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
			take: 100
		}),
		prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true, projectNumber: true }, orderBy: { name: 'asc' } }),
		prisma.site.findMany({ where: { deletedAt: null, status: 'Active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
	]);

	return {
		items: serializeBigInt(items.map((item) => ({ ...item, stock: levels.get(item.id.toString()) ?? 0 }))),
		warehouses: serializeBigInt(warehouses),
		movements: serializeBigInt(movements),
		projects: serializeBigInt(projects),
		sites: serializeBigInt(sites)
	};
};
