import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	generateBillNumber,
	generatePaymentNumber,
	postBillToFinance,
	postPaymentToFinance
} from '$lib/server/finance';
import { requestApproval } from '$lib/server/approvals';
import { serializeBigInt } from '$lib/server/projects';
import { generatePublicId } from '$lib/utils';

const toBigInt = (value: unknown) => {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
	if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
	return null;
};

export async function GET({ url }: RequestEvent) {
	try {
		const projectId = url.searchParams.get('projectId');
		const bills = await prisma.bill.findMany({
			where: {
				deletedAt: null,
				...(projectId ? { projectId: BigInt(projectId) } : {})
			},
			include: { supplier: { select: { id: true, name: true } } },
			orderBy: { billDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(bills) });
	} catch (error) {
		console.error('Error fetching bills:', error);
		return json({ success: false, error: 'Failed to fetch bills' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const subtotal = Number(body.subtotal ?? 0);
		const taxAmount = Number(body.taxAmount ?? 0);
		const supplierId = toBigInt(body.supplierId);

		if (subtotal <= 0) {
			return json({ success: false, error: 'A positive bill amount is required' }, { status: 400 });
		}

		let supplierName = body.supplierName ? String(body.supplierName).trim() : null;
		if (supplierId) {
			const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
			if (!supplier) {
				return json({ success: false, error: 'Supplier not found' }, { status: 404 });
			}
			supplierName = supplier.name;
		}

		if (!supplierName) {
			return json({ success: false, error: 'Supplier is required' }, { status: 400 });
		}

		const bill = await prisma.bill.create({
			data: {
				publicId: generatePublicId(),
				billNumber: await generateBillNumber(),
				supplierId,
				supplierName,
				projectId: toBigInt(body.projectId),
				siteId: toBigInt(body.siteId),
				documentId: toBigInt(body.documentId),
				billDate: body.billDate ? new Date(body.billDate) : new Date(),
				dueDate: body.dueDate ? new Date(body.dueDate) : null,
				description: body.description ? String(body.description) : null,
				subtotal: BigInt(Math.round(subtotal)),
				taxAmount: BigInt(Math.round(taxAmount)),
				total: BigInt(Math.round(subtotal + taxAmount)),
				status: 'Pending Approval'
			}
		});

		// Accounts payable is posted only after approval.
		await requestApproval('Bill', bill.id, locals.user?.id);

		return json({ success: true, data: serializeBigInt(bill) }, { status: 201 });
	} catch (error) {
		console.error('Error creating bill:', error);
		return json({ success: false, error: 'Failed to create bill' }, { status: 500 });
	}
}

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const id = toBigInt(body.id);
		if (!id) return json({ success: false, error: 'Bill id is required' }, { status: 400 });

		const bill = await prisma.bill.findUnique({ where: { id } });
		if (!bill || bill.deletedAt) {
			return json({ success: false, error: 'Bill not found' }, { status: 404 });
		}

		if (body.action === 'cancel') {
			const updated = await prisma.bill.update({ where: { id }, data: { status: 'Cancelled' } });
			return json({ success: true, data: serializeBigInt(updated) });
		}

		if (body.action === 'payment') {
			const amount = Number(body.amount ?? 0);
			const remaining = Number(bill.total - bill.paidAmount);
			if (!['Approved', 'PartPaid'].includes(bill.status)) {
				return json(
					{ success: false, error: 'Bill must be approved before payment' },
					{ status: 400 }
				);
			}
			if (amount <= 0 || amount > remaining) {
				return json(
					{ success: false, error: 'Payment must be positive and within the outstanding balance' },
					{ status: 400 }
				);
			}

			const payment = await prisma.payment.create({
				data: {
					publicId: generatePublicId(),
					paymentNumber: await generatePaymentNumber(),
					type: 'Payment',
					billId: id,
					documentId: toBigInt(body.documentId),
					paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
					amount: BigInt(Math.round(amount)),
					method: body.method ? String(body.method) : 'Bank Transfer',
					reference: body.reference ? String(body.reference) : null
				}
			});

			const paid = Number(bill.paidAmount) + amount;
			const updated = await prisma.bill.update({
				where: { id },
				data: {
					paidAmount: BigInt(Math.round(paid)),
					status: paid >= Number(bill.total) ? 'Paid' : 'PartPaid'
				}
			});

			await postPaymentToFinance(payment.id);

			return json({ success: true, data: serializeBigInt(updated) });
		}

		return json({ success: false, error: 'Unsupported action' }, { status: 400 });
	} catch (error) {
		console.error('Error updating bill:', error);
		return json({ success: false, error: 'Failed to update bill' }, { status: 500 });
	}
}
