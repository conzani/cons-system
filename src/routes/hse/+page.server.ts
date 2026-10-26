import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [incidents, projects, sites, documents] = await Promise.all([
		prisma.safetyIncident.findMany({ where: { deletedAt: null }, orderBy: { incidentDate: 'desc' } }),
		prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
		prisma.site.findMany({ where: { deletedAt: null, status: 'Active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
		prisma.document.findMany({ where: { isDeleted: false }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' }, take: 200 })
	]);

	return {
		incidents: serializeBigInt(incidents),
		projects: serializeBigInt(projects),
		sites: serializeBigInt(sites),
		documents: serializeBigInt(documents)
	};
};
