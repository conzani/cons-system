import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [orders, suppliers, projects, sites, documents, siteRequests] = await Promise.all([
		prisma.purchaseOrder.findMany({
			where: { deletedAt: null },
			include: {
				supplier: { select: { id: true, name: true } },
				items: true
			},
			orderBy: { orderDate: 'desc' },
			take: 200
		}),
		prisma.supplier.findMany({
			where: { deletedAt: null },
			include: { _count: { select: { purchaseOrders: true, bills: true } } },
			orderBy: { name: 'asc' }
		}),
		prisma.project.findMany({
			where: { deletedAt: null },
			select: { id: true, name: true, projectNumber: true },
			orderBy: { name: 'asc' }
		}),
		prisma.site.findMany({
			where: { deletedAt: null, status: 'Active' },
			select: { id: true, name: true, projectId: true },
			orderBy: { name: 'asc' }
		}),
		prisma.document.findMany({
			where: { isDeleted: false },
			select: { id: true, title: true, fileName: true },
			orderBy: { createdAt: 'desc' },
			take: 200
		}),
		prisma.siteRequest.findMany({
			where: { deletedAt: null, status: { in: ['Approved', 'Ordered'] } },
			select: { id: true, requestNumber: true, requestType: true, estimatedTotal: true, siteId: true },
			orderBy: { createdAt: 'desc' },
			take: 100
		})
	]);

	return {
		orders: serializeBigInt(orders),
		suppliers: serializeBigInt(suppliers),
		projects: serializeBigInt(projects),
		sites: serializeBigInt(sites),
		documents: serializeBigInt(documents),
		siteRequests: serializeBigInt(siteRequests)
	};
};
