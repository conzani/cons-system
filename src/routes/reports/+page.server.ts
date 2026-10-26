import { prisma } from '$lib/db';
import { financeSummary } from '$lib/server/finance';
import { stockLevels } from '$lib/server/inventory';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [summary, projects, invoices, expenseLines, payroll, bills, equipmentCosts, items, levels, incidents, ncrs, tenders] =
		await Promise.all([
			financeSummary(),
			prisma.project.findMany({
				where: { deletedAt: null },
				select: { id: true, name: true, projectNumber: true, value: true, status: true, progress: true },
				orderBy: { name: 'asc' }
			}),
			prisma.invoice.findMany({ where: { deletedAt: null }, select: { projectId: true, total: true, paidAmount: true } }),
			prisma.journalLine.findMany({
				where: { entry: { status: 'Posted' }, account: { type: 'Expense' } },
				include: { account: { select: { name: true, code: true } } }
			}),
			prisma.payroll.aggregate({
				where: { deletedAt: null },
				_sum: { grossPay: true, netPay: true, taxAmount: true }
			}),
			prisma.bill.aggregate({ where: { deletedAt: null }, _sum: { total: true, paidAmount: true } }),
			prisma.equipmentLog.aggregate({ _sum: { cost: true } }),
			prisma.inventoryItem.findMany({ where: { deletedAt: null }, select: { id: true, unitCost: true } }),
			stockLevels(),
			prisma.safetyIncident.findMany({ where: { deletedAt: null }, select: { status: true, lostDays: true } }),
			prisma.ncr.findMany({ where: { deletedAt: null }, select: { status: true } }),
			prisma.tender.findMany({ where: { deletedAt: null }, select: { status: true, value: true } })
		]);

	const invoicedByProject = new Map<string, number>();
	const costsByProject = new Map<string, number>();
	const costByAccount = new Map<string, { code: string; name: string; amount: number }>();

	for (const invoice of invoices) {
		if (!invoice.projectId) continue;
		const key = invoice.projectId.toString();
		invoicedByProject.set(key, (invoicedByProject.get(key) ?? 0) + Number(invoice.total));
	}

	for (const line of expenseLines) {
		const amount = Number(line.debit) - Number(line.credit);
		const accountKey = line.account.code;
		const existing = costByAccount.get(accountKey) ?? { code: line.account.code, name: line.account.name, amount: 0 };
		existing.amount += amount;
		costByAccount.set(accountKey, existing);

		if (line.projectId) {
			const key = line.projectId.toString();
			costsByProject.set(key, (costsByProject.get(key) ?? 0) + amount);
		}
	}

	const projectProfitability = projects.map((project) => {
		const key = project.id.toString();
		const invoiced = invoicedByProject.get(key) ?? 0;
		const cost = costsByProject.get(key) ?? 0;
		return {
			id: key,
			projectNumber: project.projectNumber,
			name: project.name,
			status: project.status,
			progress: project.progress,
			value: Number(project.value ?? 0),
			invoiced,
			cost,
			margin: invoiced - cost
		};
	});

	const won = tenders.filter((tender) => tender.status === 'Won').length;
	const lost = tenders.filter((tender) => tender.status === 'Lost').length;
	const inventoryValue = items.reduce((sum, item) => sum + Number(item.unitCost) * (levels.get(item.id.toString()) ?? 0), 0);

	return {
		summary: serializeBigInt(summary),
		projectProfitability: serializeBigInt(projectProfitability),
		costBreakdown: serializeBigInt(
			[...costByAccount.values()].sort((a, b) => b.amount - a.amount)
		),
		operations: serializeBigInt({
			payrollGross: payroll._sum.grossPay ?? 0,
			payrollNet: payroll._sum.netPay ?? 0,
			payrollTax: payroll._sum.taxAmount ?? 0,
			procurementSpend: bills._sum.total ?? 0,
			procurementOutstanding: Number(bills._sum.total ?? 0) - Number(bills._sum.paidAmount ?? 0),
			equipmentCost: equipmentCosts._sum.cost ?? 0,
			inventoryValue,
			incidents: incidents.length,
			openIncidents: incidents.filter((incident) => incident.status !== 'Closed').length,
			lostDays: incidents.reduce((sum, incident) => sum + incident.lostDays, 0),
			openNcrs: ncrs.filter((ncr) => ncr.status !== 'Closed').length,
			tenders: tenders.length,
			winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null
		})
	};
};
