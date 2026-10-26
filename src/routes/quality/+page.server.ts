import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [inspections, ncrs, projects, sites, documents] = await Promise.all([
		prisma.inspection.findMany({ where: { deletedAt: null }, orderBy: { inspectionDate: 'desc' } }),
		prisma.ncr.findMany({ where: { deletedAt: null }, orderBy: { raisedDate: 'desc' } }),
		prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true, projectNumber: true }, orderBy: { name: 'asc' } }),
		prisma.site.findMany({ where: { deletedAt: null, status: 'Active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
		prisma.document.findMany({ where: { isDeleted: false }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' }, take: 200 })
	]);

	return {
		inspections: serializeBigInt(inspections),
		ncrs: serializeBigInt(ncrs),
		projects: serializeBigInt(projects),
		sites: serializeBigInt(sites),
		documents: serializeBigInt(documents)
	};
};
