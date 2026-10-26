import { prisma } from '$lib/db';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date();
	const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const [
		activeTenders,
		closingSoon,
		activeProjects,
		activeSites,
		activeEmployees,
		activeDocuments,
		payrollAggregate,
		sites,
		tenders
	] = await Promise.all([
		prisma.tender.count({
			where: { deletedAt: null, status: { notIn: ['Won', 'Lost', 'Cancelled'] } }
		}),
		prisma.tender.count({
			where: {
				deletedAt: null,
				status: { notIn: ['Won', 'Lost', 'Cancelled'] },
				closingDate: { gte: now, lte: in30Days }
			}
		}),
		prisma.project.count({ where: { deletedAt: null, status: 'Active' } }),
		prisma.site.count({ where: { deletedAt: null, status: 'Active' } }),
		prisma.employee.count({ where: { deletedAt: null, employmentStatus: 'Active' } }),
		prisma.document.count({ where: { isDeleted: false } }),
		prisma.payroll.aggregate({
			where: { deletedAt: null, status: { in: ['Draft', 'Calculated', 'Approved'] } },
			_sum: { netPay: true }
		}),
		prisma.site.findMany({
			where: { deletedAt: null, status: 'Active' },
			select: { id: true, name: true, client: true, location: true, progress: true },
			orderBy: { progress: 'asc' },
			take: 5
		}),
		prisma.tender.findMany({
			where: { deletedAt: null, closingDate: { gte: now } },
			select: { id: true, title: true, client: true, closingDate: true, status: true, value: true },
			orderBy: { closingDate: 'asc' },
			take: 5
		})
	]);

	return {
		user: locals.user,
		stats: serializeBigInt({
			activeTenders,
			closingSoon,
			activeProjects,
			activeSites,
			activeEmployees,
			activeDocuments,
			pendingPayroll: payrollAggregate._sum.netPay ?? 0
		}),
		sites: serializeBigInt(sites),
		tenders: serializeBigInt(tenders)
	};
};
