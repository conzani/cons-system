import { error } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { projectDetailInclude, projectWhere, serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await prisma.project.findFirst({
		where: { ...projectWhere(params.id), deletedAt: null },
		include: projectDetailInclude
	});

	if (!project) {
		error(404, 'Project not found');
	}

	const [employees, documentTypes, documents, folders, costRows] = await Promise.all([
		prisma.employee.findMany({
			where: { deletedAt: null, employmentStatus: 'Active' },
			select: { id: true, firstname: true, lastname: true, employeeNumber: true },
			orderBy: { firstname: 'asc' }
		}),
		prisma.documentType.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		}),
		prisma.document.findMany({
			where: { projectId: project.id, isDeleted: false },
			include: {
				documentType: true,
				owner: { select: { id: true, firstname: true, lastname: true } }
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.documentFolder.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		}),
		prisma.journalLine.groupBy({
			by: ['accountId'],
			where: { projectId: project.id, entry: { status: 'Posted' } },
			_sum: { debit: true, credit: true }
		})
	]);

	const costAccountIds = costRows.map((row) => row.accountId);
	const costAccounts = await prisma.account.findMany({
		where: { id: { in: costAccountIds }, type: 'Expense' }
	});
	const accountMap = new Map(costAccounts.map((account) => [account.id.toString(), account]));

	const costs = costRows
		.map((row) => {
			const account = accountMap.get(row.accountId.toString());
			if (!account) return null;
			return {
				code: account.code,
				name: account.name,
				amount: Number(row._sum.debit ?? 0) - Number(row._sum.credit ?? 0)
			};
		})
		.filter(Boolean)
		.filter((cost) => cost !== null && cost.amount !== 0);

	return {
		project: serializeBigInt(project),
		employees: serializeBigInt(employees),
		documentTypes: serializeBigInt(documentTypes),
		documents: serializeBigInt(documents),
		folders: serializeBigInt(folders),
		costs: serializeBigInt(costs),
		costTotal: costs.reduce((sum, cost) => sum + Number(cost!.amount), 0)
	};
};
