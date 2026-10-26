import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [projects, employees, tenders] = await Promise.all([
		prisma.project.findMany({
			where: { deletedAt: null },
			include: {
				tenders: {
					where: { deletedAt: null },
					select: { id: true, publicId: true, tenderNumber: true, title: true, status: true }
				},
				sites: {
					where: { deletedAt: null },
					select: { id: true, publicId: true, siteNumber: true, name: true, status: true, progress: true }
				},
				_count: {
					select: {
						documents: { where: { isDeleted: false } },
						phases: { where: { deletedAt: null } },
						teamMembers: { where: { deletedAt: null } }
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.employee.findMany({
			where: { deletedAt: null, employmentStatus: 'Active' },
			select: { id: true, firstname: true, lastname: true, employeeNumber: true },
			orderBy: { firstname: 'asc' }
		}),
		prisma.tender.findMany({
			where: { deletedAt: null, projectId: null },
			select: { id: true, publicId: true, tenderNumber: true, title: true, client: true, status: true },
			orderBy: { createdAt: 'desc' }
		})
	]);

	return {
		projects: serializeBigInt(projects),
		employees: serializeBigInt(employees),
		tenders: serializeBigInt(tenders)
	};
};
