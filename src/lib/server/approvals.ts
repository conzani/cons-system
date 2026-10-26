import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';
import { postBillToFinance, postInvoiceToFinance, postPayrollToFinance } from './finance';
import { logActivity } from './activity';

export const APPROVAL_PERMISSIONS: Record<string, string> = {
	Invoice: 'manage_invoices',
	Bill: 'manage_accounts_payable',
	Payroll: 'manage_payroll',
	PurchaseOrder: 'manage_orders'
};

export function approvalPermission(entityType: string): string {
	return APPROVAL_PERMISSIONS[entityType] ?? 'view_admin';
}

export async function requestApproval(
	entityType: string,
	entityId: bigint,
	requestedBy?: bigint
) {
	const existing = await prisma.approval.findFirst({
		where: { entityType, entityId, status: 'Pending' },
		select: { id: true }
	});
	if (existing) return existing;

	const approval = await prisma.approval.create({
		data: {
			publicId: generatePublicId(),
			entityType,
			entityId,
			requestedBy: requestedBy ?? null,
			status: 'Pending'
		}
	});

	await logActivity({
		entityType: entityType as any,
		entityId,
		action: 'submitted',
		description: 'Submitted for approval',
		userId: requestedBy ?? null
	});

	return approval;
}

export async function decideApproval(input: {
	entityType: string;
	entityId: bigint;
	action: 'approve' | 'reject';
	decidedBy: bigint;
	notes?: string | null;
}) {
	const approval = await prisma.approval.findFirst({
		where: { entityType: input.entityType, entityId: input.entityId, status: 'Pending' },
		orderBy: { requestedAt: 'desc' }
	});

	if (!approval) {
		throw new Error('No pending approval found for this record');
	}

	const approved = input.action === 'approve';

	if (input.entityType === 'Invoice') {
		const invoice = await prisma.invoice.findUnique({ where: { id: input.entityId } });
		if (!invoice || invoice.deletedAt) throw new Error('Invoice not found');
		await prisma.invoice.update({
			where: { id: invoice.id },
			data: { status: approved ? 'Sent' : 'Rejected' }
		});
		if (approved) await postInvoiceToFinance(invoice.id);
	} else if (input.entityType === 'Bill') {
		const bill = await prisma.bill.findUnique({ where: { id: input.entityId } });
		if (!bill || bill.deletedAt) throw new Error('Bill not found');
		await prisma.bill.update({
			where: { id: bill.id },
			data: { status: approved ? 'Approved' : 'Rejected' }
		});
		if (approved) await postBillToFinance(bill.id);
	} else if (input.entityType === 'Payroll') {
		const payroll = await prisma.payroll.findUnique({ where: { id: input.entityId } });
		if (!payroll || payroll.deletedAt) throw new Error('Payroll not found');
		await prisma.payroll.update({
			where: { id: payroll.id },
			data: { status: approved ? 'Approved' : 'Calculated' }
		});
		if (approved) await postPayrollToFinance(payroll.id, input.decidedBy);
	} else if (input.entityType === 'PurchaseOrder') {
		const order = await prisma.purchaseOrder.findUnique({ where: { id: input.entityId } });
		if (!order || order.deletedAt) throw new Error('Purchase order not found');
		await prisma.purchaseOrder.update({
			where: { id: order.id },
			data: { status: approved ? 'Ordered' : 'Cancelled' }
		});
	} else {
		throw new Error(`Unsupported approval entity: ${input.entityType}`);
	}

	await logActivity({
		entityType: input.entityType as any,
		entityId: input.entityId,
		action: approved ? 'approved' : 'rejected',
		description: approved ? 'Approved by management' : 'Rejected by management',
		userId: input.decidedBy,
		metadata: input.notes ? { notes: input.notes } : undefined
	});

	return prisma.approval.update({
		where: { id: approval.id },
		data: {
			status: approved ? 'Approved' : 'Rejected',
			decidedBy: input.decidedBy,
			decidedAt: new Date(),
			decisionNotes: input.notes ?? null
		}
	});
}
