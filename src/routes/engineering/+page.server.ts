import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [rfis, projectRows, sites, drawings, documents] = await Promise.all([
		prisma.rfi.findMany({ where: { deletedAt: null }, orderBy: { raisedDate: 'desc' } }),
		prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
		prisma.site.findMany({ where: { deletedAt: null, status: 'Active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
		prisma.document.findMany({
			where: {
				isDeleted: false,
				OR: [
					{ documentType: { name: { in: ['Drawing', 'Shop Drawing', 'As-Built Drawing'] } } },
					{ fileExtension: { in: ['dwg', 'dxf', 'ifc', 'dgn'] } }
				]
			},
			include: {
				documentType: { select: { name: true } },
				project: { select: { id: true, name: true } },
				owner: { select: { firstname: true, lastname: true } }
			},
			orderBy: { createdAt: 'desc' },
			take: 100
		}),
		prisma.document.findMany({
			where: { isDeleted: false },
			select: { id: true, title: true },
			orderBy: { createdAt: 'desc' },
			take: 200
		})
	]);

	return {
		rfis: serializeBigInt(rfis),
		projects: serializeBigInt(projectRows),
		sites: serializeBigInt(sites),
		drawings: serializeBigInt(drawings),
		documents: serializeBigInt(documents)
	};
};
