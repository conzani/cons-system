import { prisma } from '$lib/db';
import { financeSummary } from '$lib/server/finance';
import { serializeBigInt } from '$lib/server/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [summary, accounts, invoices, bills, projects, sites, documents, payments] = await Promise.all([
		financeSummary(),
		prisma.account.findMany({ orderBy: { code: 'asc' } }),
		prisma.invoice.findMany({ where: { deletedAt: null }, orderBy: { issueDate: 'desc' }, take: 100 }),
		prisma.bill.findMany({
			where: { deletedAt: null },
			include: { supplier: { select: { id: true, name: true } } },
			orderBy: { billDate: 'desc' },
			take: 100
		}),
		prisma.project.findMany({
			where: { deletedAt: null },
			select: { id: true, name: true, projectNumber: true },
			orderBy: { name: 'asc' }
		}),
		prisma.site.findMany({
			where: { deletedAt: null },
			select: { id: true, name: true },
			orderBy: { name: 'asc' }
		}),
		prisma.document.findMany({
			where: { isDeleted: false },
			select: { id: true, title: true, fileName: true, publicId: true },
			orderBy: { createdAt: 'desc' },
			take: 200
		}),
		prisma.payment.findMany({
			where: { documentId: { not: null } },
			select: { id: true, invoiceId: true, billId: true, documentId: true, paymentDate: true },
			orderBy: { paymentDate: 'desc' }
		})
	]);

	return {
		summary: serializeBigInt(summary),
		accounts: serializeBigInt(accounts),
		invoices: serializeBigInt(invoices),
		bills: serializeBigInt(bills),
		projects: serializeBigInt(projects),
		sites: serializeBigInt(sites),
		documents: serializeBigInt(documents),
		payments: serializeBigInt(payments)
	};
};
