import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [equipment, logs, projects, sites, documents] = await Promise.all([
		prisma.equipment.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
		prisma.equipmentLog.findMany({
			include: { equipment: { select: { id: true, name: true, code: true } } },
			orderBy: { logDate: 'desc' },
			take: 100
		}),
		prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true, projectNumber: true }, orderBy: { name: 'asc' } }),
		prisma.site.findMany({ where: { deletedAt: null, status: 'Active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
		prisma.document.findMany({ where: { isDeleted: false }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' }, take: 200 })
	]);

	return {
		equipment: serializeBigInt(equipment),
		logs: serializeBigInt(logs),
		projects: serializeBigInt(projects),
		sites: serializeBigInt(sites),
		documents: serializeBigInt(documents)
	};
};
