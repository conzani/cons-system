import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

/** Standard chart-of-accounts codes (seeded by prisma/seed.ts). */
export const ACCOUNT = {
	CASH: '1000',
	RECEIVABLE: '1100',
	INVENTORY: '1200',
	EQUIPMENT: '1500',
	PAYABLE: '2000',
	PAYROLL_PAYABLE: '2100',
	TAX_PAYABLE: '2200',
	STATUTORY_PAYABLE: '2300',
	DEDUCTIONS_PAYABLE: '2400',
	EQUITY: '3000',
	OPENING_EQUITY: '3100',
	REVENUE: '4000',
	OTHER_INCOME: '4100',
	DIRECT_LABOUR: '5000',
	MATERIALS: '5100',
	EQUIPMENT_COST: '5200',
	SUBCONTRACTORS: '5300',
	SITE_OVERHEAD: '5400',
	STATUTORY_COST: '5500',
	ADMIN: '5600'
} as const;

export type JournalLineInput = {
	accountCode: string;
	debit?: number;
	credit?: number;
	description?: string;
	projectId?: bigint | null;
	siteId?: bigint | null;
	departmentId?: bigint | null;
};

export type PostEntryInput = {
	entryDate?: Date;
	description: string;
	sourceType?: string;
	sourceId?: bigint;
	createdBy?: bigint;
	lines: JournalLineInput[];
};

async function uniqueNumber(
	prefix: string,
	check: (candidate: string) => Promise<boolean>
): Promise<string> {
	const year = new Date().getFullYear();
	for (let attempt = 0; attempt < 20; attempt += 1) {
		const serial = String(Math.floor(Math.random() * 900000) + 100000);
		const candidate = `${prefix}/${year}/${serial}`;
		if (!(await check(candidate))) return candidate;
	}
	throw new Error(`Unable to allocate a unique ${prefix} number`);
}

export function generateEntryNumber(): Promise<string> {
	return uniqueNumber('JE', async (candidate) => {
		const found = await prisma.journalEntry.findUnique({
			where: { entryNumber: candidate },
			select: { id: true }
		});
		return !!found;
	});
}

export function generateInvoiceNumber(): Promise<string> {
	return uniqueNumber('INV', async (candidate) => {
		const found = await prisma.invoice.findUnique({
			where: { invoiceNumber: candidate },
			select: { id: true }
		});
		return !!found;
	});
}

export function generateBillNumber(): Promise<string> {
	return uniqueNumber('BILL', async (candidate) => {
		const found = await prisma.bill.findUnique({
			where: { billNumber: candidate },
			select: { id: true }
		});
		return !!found;
	});
}

export function generatePaymentNumber(): Promise<string> {
	return uniqueNumber('PAY', async (candidate) => {
		const found = await prisma.payment.findUnique({
			where: { paymentNumber: candidate },
			select: { id: true }
		});
		return !!found;
	});
}

export function generatePoNumber(): Promise<string> {
	return uniqueNumber('PO', async (candidate) => {
		const found = await prisma.purchaseOrder.findUnique({
			where: { poNumber: candidate },
			select: { id: true }
		});
		return !!found;
	});
}

const round = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

/**
 * Writes a balanced double-entry journal. Throws when debits and credits differ,
 * which protects the ledger from half-written financial postings.
 */
export async function postJournalEntry(input: PostEntryInput) {
	const lines = input.lines
		.map((line) => ({
			...line,
			debit: round(line.debit ?? 0),
			credit: round(line.credit ?? 0)
		}))
		.filter((line) => line.debit > 0 || line.credit > 0);

	if (lines.length === 0) return null;

	const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
	const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

	if (totalDebit !== totalCredit) {
		throw new Error(`Journal is not balanced (debit ${totalDebit} / credit ${totalCredit})`);
	}

	const codes = [...new Set(lines.map((line) => line.accountCode))];
	const accounts = await prisma.account.findMany({ where: { code: { in: codes } } });
	const accountMap = new Map(accounts.map((account) => [account.code, account.id]));

	const missing = codes.filter((code) => !accountMap.has(code));
	if (missing.length > 0) {
		throw new Error(`Missing ledger account(s): ${missing.join(', ')}`);
	}

	const entryNumber = await generateEntryNumber();

	return prisma.journalEntry.create({
		data: {
			publicId: generatePublicId(),
			entryNumber,
			entryDate: input.entryDate ?? new Date(),
			description: input.description,
			sourceType: input.sourceType ?? 'Manual',
			sourceId: input.sourceId ?? null,
			status: 'Posted',
			postedAt: new Date(),
			createdBy: input.createdBy ?? null,
			lines: {
				create: lines.map((line) => ({
					publicId: generatePublicId(),
					accountId: accountMap.get(line.accountCode)!,
					description: line.description ?? null,
					debit: BigInt(line.debit),
					credit: BigInt(line.credit),
					projectId: line.projectId ?? null,
					siteId: line.siteId ?? null,
					departmentId: line.departmentId ?? null
				}))
			}
		},
		include: { lines: { include: { account: true } } }
	});
}

async function existingEntry(sourceType: string, sourceId: bigint) {
	return prisma.journalEntry.findFirst({
		where: { sourceType, sourceId, status: 'Posted' },
		select: { id: true }
	});
}

/**
 * HR → Finance bridge. Posts an approved payroll record to the ledger, splitting
 * direct labour across the projects/sites the employee actually worked on
 * (from timesheets within the pay period). Falls back to site overheads.
 */
export async function postPayrollToFinance(payrollId: bigint, createdBy?: bigint) {
	const payroll = await prisma.payroll.findUnique({
		where: { id: payrollId },
		include: { employee: true }
	});

	if (!payroll || payroll.deletedAt) return null;
	if (await existingEntry('Payroll', payroll.id)) return null;

	const gross = Number(payroll.grossPay);
	const net = Number(payroll.netPay);
	const tax = Number(payroll.taxAmount);
	const pension = Number(payroll.pensionAmount ?? 0);
	const insurance = Number(payroll.insuranceAmount ?? 0);
	// With Net-salary payroll the gross is derived from net, so never post less than
	// the sum of the amounts actually owed.
	const labourCost = Math.max(gross, net + tax + pension + insurance);
	const otherDeductions = Math.max(labourCost - (net + tax + pension + insurance), 0);

	const timesheets = await prisma.timesheet.findMany({
		where: {
			employeeId: payroll.employeeId,
			deletedAt: null,
			date: { gte: payroll.payPeriodStart, lte: payroll.payPeriodEnd }
		},
		select: { projectId: true, siteId: true, regularHours: true, overtimeHours: true }
	});

	type Allocation = { projectId: bigint | null; siteId: bigint | null; hours: number };
	const allocations = new Map<string, Allocation>();
	let totalHours = 0;

	for (const sheet of timesheets) {
		const hours = Number(sheet.regularHours) + Number(sheet.overtimeHours);
		if (hours <= 0) continue;
		totalHours += hours;
		const key = `${sheet.projectId ?? ''}:${sheet.siteId ?? ''}`;
		const existing = allocations.get(key);
		if (existing) existing.hours += hours;
		else allocations.set(key, { projectId: sheet.projectId, siteId: sheet.siteId, hours });
	}

	const costLines: JournalLineInput[] = [];
	if (totalHours === 0 || allocations.size === 0) {
		costLines.push({ accountCode: ACCOUNT.DIRECT_LABOUR, debit: labourCost, description: 'Unallocated labour' });
	} else {
		const entries = [...allocations.values()];
		let allocated = 0;
		entries.forEach((allocation, index) => {
			const isLast = index === entries.length - 1;
			const amount = isLast ? labourCost - allocated : round((labourCost * allocation.hours) / totalHours);
			allocated += amount;
			if (amount <= 0) return;
			costLines.push({
				accountCode: ACCOUNT.DIRECT_LABOUR,
				debit: amount,
				description: `Labour allocation (${allocation.hours.toFixed(1)}h)`,
				projectId: allocation.projectId,
				siteId: allocation.siteId
			});
		});
	}

	const lines: JournalLineInput[] = [...costLines];
	if (Number(payroll.netPay) > 0) {
		lines.push({
			accountCode: ACCOUNT.PAYROLL_PAYABLE,
			credit: Number(payroll.netPay),
			description: 'Net pay payable'
		});
	}
	if (Number(payroll.taxAmount) > 0) {
		lines.push({ accountCode: ACCOUNT.TAX_PAYABLE, credit: Number(payroll.taxAmount), description: 'PAYE' });
	}
	const statutory = Number(payroll.pensionAmount ?? 0) + Number(payroll.insuranceAmount ?? 0);
	if (statutory > 0) {
		lines.push({
			accountCode: ACCOUNT.STATUTORY_PAYABLE,
			credit: statutory,
			description: 'Pension and insurance'
		});
	}
	if (otherDeductions > 0) {
		lines.push({
			accountCode: ACCOUNT.DEDUCTIONS_PAYABLE,
			credit: otherDeductions,
			description: 'Other deductions'
		});
	}

	const debit = lines.reduce((sum, line) => sum + (line.debit ?? 0), 0);
	const credit = lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);
	if (debit !== credit) {
		throw new Error(`Payroll journal would not balance (debit ${debit} / credit ${credit})`);
	}

	return postJournalEntry({
		entryDate: payroll.payPeriodEnd,
		description: `Payroll — ${payroll.employee.firstname} ${payroll.employee.lastname}`,
		sourceType: 'Payroll',
		sourceId: payroll.id,
		createdBy,
		lines: lines.filter((line) => (line.debit ?? 0) > 0 || (line.credit ?? 0) > 0)
	});
}

export async function postInvoiceToFinance(invoiceId: bigint) {
	const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
	if (!invoice || invoice.deletedAt || invoice.total <= 0n) return null;
	if (await existingEntry('Invoice', invoice.id)) return null;

	const subtotal = Number(invoice.total) - Number(invoice.taxAmount);
	const projectId = invoice.projectId;
	const siteId = invoice.siteId;

	return postJournalEntry({
		entryDate: invoice.issueDate,
		description: `Invoice ${invoice.invoiceNumber} — ${invoice.client}`,
		sourceType: 'Invoice',
		sourceId: invoice.id,
		lines: [
			{ accountCode: ACCOUNT.RECEIVABLE, debit: Number(invoice.total), projectId, siteId },
			{ accountCode: ACCOUNT.REVENUE, credit: subtotal, projectId, siteId },
			...(Number(invoice.taxAmount) > 0
				? [{ accountCode: ACCOUNT.TAX_PAYABLE, credit: Number(invoice.taxAmount), projectId, siteId }]
				: [])
		]
	});
}

export async function postBillToFinance(billId: bigint) {
	const bill = await prisma.bill.findUnique({ where: { id: billId } });
	if (!bill || bill.deletedAt || bill.total <= 0n) return null;
	if (await existingEntry('Bill', bill.id)) return null;

	const purchaseAccount = bill.purchaseOrderId ? ACCOUNT.INVENTORY : ACCOUNT.ADMIN;
	const subtotal = Number(bill.total) - Number(bill.taxAmount);

	return postJournalEntry({
		entryDate: bill.billDate,
		description: `Supplier bill ${bill.billNumber} — ${bill.supplierName ?? 'Supplier'}`,
		sourceType: 'Bill',
		sourceId: bill.id,
		lines: [
			{ accountCode: purchaseAccount, debit: subtotal, projectId: bill.projectId, siteId: bill.siteId },
			...(Number(bill.taxAmount) > 0
				? [{ accountCode: ACCOUNT.TAX_PAYABLE, debit: Number(bill.taxAmount) }]
				: []),
			{ accountCode: ACCOUNT.PAYABLE, credit: Number(bill.total) }
		]
	});
}

export async function postPaymentToFinance(paymentId: bigint) {
	const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
	if (!payment) return null;
	if (await existingEntry('Payment', payment.id)) return null;

	const amount = Number(payment.amount);
	const isReceipt = payment.type === 'Receipt';

	return postJournalEntry({
		entryDate: payment.paymentDate,
		description: `${isReceipt ? 'Receipt' : 'Payment'} ${payment.paymentNumber}`,
		sourceType: 'Payment',
		sourceId: payment.id,
		lines: isReceipt
			? [
					{ accountCode: ACCOUNT.CASH, debit: amount },
					{ accountCode: ACCOUNT.RECEIVABLE, credit: amount }
				]
			: [
					{ accountCode: ACCOUNT.PAYABLE, debit: amount },
					{ accountCode: ACCOUNT.CASH, credit: amount }
				]
	});
}

export async function postStockIssue(
	movementId: bigint,
	details: { itemName: string; quantity: number; unitCost: number; projectId?: bigint | null; siteId?: bigint | null }
) {
	const value = round(details.quantity * details.unitCost);
	if (value <= 0) return null;
	if (await existingEntry('StockIssue', movementId)) return null;

	return postJournalEntry({
		description: `Material issue — ${details.itemName}`,
		sourceType: 'StockIssue',
		sourceId: movementId,
		lines: [
			{
				accountCode: ACCOUNT.MATERIALS,
				debit: value,
				projectId: details.projectId ?? null,
				siteId: details.siteId ?? null
			},
			{ accountCode: ACCOUNT.INVENTORY, credit: value }
		]
	});
}

export async function postManualStockIn(
	movementId: bigint,
	details: { itemName: string; quantity: number; unitCost: number }
) {
	const value = round(details.quantity * details.unitCost);
	if (value <= 0) return null;
	if (await existingEntry('StockIn', movementId)) return null;

	return postJournalEntry({
		description: `Stock received — ${details.itemName}`,
		sourceType: 'StockIn',
		sourceId: movementId,
		lines: [
			{ accountCode: ACCOUNT.INVENTORY, debit: value },
			{ accountCode: ACCOUNT.OPENING_EQUITY, credit: value }
		]
	});
}

export async function postEquipmentCost(
	logId: bigint,
	details: { equipmentName: string; cost: number; projectId?: bigint | null; siteId?: bigint | null }
) {
	if (details.cost <= 0) return null;
	if (await existingEntry('EquipmentLog', logId)) return null;

	return postJournalEntry({
		description: `Equipment — ${details.equipmentName}`,
		sourceType: 'EquipmentLog',
		sourceId: logId,
		lines: [
			{
				accountCode: ACCOUNT.EQUIPMENT_COST,
				debit: details.cost,
				projectId: details.projectId ?? null,
				siteId: details.siteId ?? null
			},
			{ accountCode: ACCOUNT.CASH, credit: details.cost }
		]
	});
}

export async function accountBalanceMap(): Promise<Map<string, number>> {
	const accounts = await prisma.account.findMany({ select: { id: true, code: true } });
	const grouped = await prisma.journalLine.groupBy({
		by: ['accountId'],
		_sum: { debit: true, credit: true }
	});
	const balances = new Map<string, number>();
	for (const account of accounts) balances.set(account.code, 0);
	for (const row of grouped) {
		const account = accounts.find((candidate) => candidate.id === row.accountId);
		if (!account) continue;
		const balance = Number(row._sum.debit ?? 0) - Number(row._sum.credit ?? 0);
		balances.set(account.code, balance);
	}
	return balances;
}

export async function financeSummary() {
	const [balances, invoices, bills, entries, revenue, expenses] = await Promise.all([
		accountBalanceMap(),
		prisma.invoice.findMany({
			where: { deletedAt: null, status: { in: ['Sent', 'PartPaid', 'Paid', 'Overdue'] } }
		}),
		prisma.bill.findMany({
			where: { deletedAt: null, status: { in: ['Approved', 'PartPaid', 'Paid'] } }
		}),
		prisma.journalEntry.findMany({
			where: { status: 'Posted' },
			include: { lines: { include: { account: true } } },
			orderBy: { entryDate: 'desc' },
			take: 10
		}),
		prisma.account.findMany({ where: { type: 'Revenue' }, select: { id: true } }),
		prisma.account.findMany({ where: { type: 'Expense' }, select: { id: true } })
	]);

	const revenueIds = revenue.map((account) => account.id);
	const expenseIds = expenses.map((account) => account.id);

	const [revenueAgg, expenseAgg] = await Promise.all([
		prisma.journalLine.aggregate({
			where: { accountId: { in: revenueIds } },
			_sum: { credit: true, debit: true }
		}),
		prisma.journalLine.aggregate({
			where: { accountId: { in: expenseIds } },
			_sum: { credit: true, debit: true }
		})
	]);

	const totalRevenue = Number(revenueAgg._sum.credit ?? 0) - Number(revenueAgg._sum.debit ?? 0);
	const totalExpenses = Number(expenseAgg._sum.debit ?? 0) - Number(expenseAgg._sum.credit ?? 0);

	const receivable = invoices.reduce((sum, invoice) => sum + Number(invoice.total - invoice.paidAmount), 0);
	const payable = bills.reduce((sum, bill) => sum + Number(bill.total - bill.paidAmount), 0);

	return {
		cash: balances.get(ACCOUNT.CASH) ?? 0,
		receivable,
		payable,
		totalRevenue,
		totalExpenses,
		profit: totalRevenue - totalExpenses,
		invoiceCount: invoices.length,
		billCount: bills.length,
		entries
	};
}
