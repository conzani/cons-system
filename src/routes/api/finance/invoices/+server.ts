import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	generateInvoiceNumber,
	generatePaymentNumber,
	postInvoiceToFinance,
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
		const invoices = await prisma.invoice.findMany({
			where: {
				deletedAt: null,
				...(projectId ? { projectId: BigInt(projectId) } : {})
			},
			orderBy: { issueDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(invoices) });
	} catch (error) {
		console.error('Error fetching invoices:', error);
		return json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const client = String(body.client ?? '').trim();
		const subtotal = Number(body.subtotal ?? 0);
		const taxAmount = Number(body.taxAmount ?? 0);

		if (!client || subtotal <= 0) {
			return json({ success: false, error: 'Client and a positive amount are required' }, { status: 400 });
		}
		if (body.documentId && !toBigInt(body.documentId)) {
			return json({ success: false, error: 'Invalid supporting document' }, { status: 400 });
		}

		const invoice = await prisma.invoice.create({
			data: {
				publicId: generatePublicId(),
				invoiceNumber: await generateInvoiceNumber(),
				client,
				projectId: toBigInt(body.projectId),
				siteId: toBigInt(body.siteId),
				documentId: toBigInt(body.documentId),
				issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
				dueDate: body.dueDate ? new Date(body.dueDate) : null,
				description: body.description ? String(body.description) : null,
				subtotal: BigInt(Math.round(subtotal)),
				taxAmount: BigInt(Math.round(taxAmount)),
				total: BigInt(Math.round(subtotal + taxAmount)),
				status: body.status === 'Draft' ? 'Draft' : 'Pending Approval'
			}
		});

		// Revenue is only posted once an authorised user approves the invoice.
		if (invoice.status !== 'Draft') {
			await requestApproval('Invoice', invoice.id, locals.user?.id);
		}

		return json({ success: true, data: serializeBigInt(invoice) }, { status: 201 });
	} catch (error) {
		console.error('Error creating invoice:', error);
		return json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
	}
}

export async function PATCH({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const id = toBigInt(body.id);
		if (!id) return json({ success: false, error: 'Invoice id is required' }, { status: 400 });

		const invoice = await prisma.invoice.findUnique({ where: { id } });
		if (!invoice || invoice.deletedAt) {
			return json({ success: false, error: 'Invoice not found' }, { status: 404 });
		}

		if (body.action === 'send') {
			const updated = await prisma.invoice.update({
				where: { id },
				data: { status: 'Pending Approval' }
			});
			await requestApproval('Invoice', id, locals.user?.id);
			return json({ success: true, data: serializeBigInt(updated) });
		}

		if (body.action === 'cancel') {
			const updated = await prisma.invoice.update({
				where: { id },
				data: { status: 'Cancelled' }
			});
			return json({ success: true, data: serializeBigInt(updated) });
		}

		if (body.action === 'payment') {
			const amount = Number(body.amount ?? 0);
			if (amount <= 0) {
				return json({ success: false, error: 'Payment amount must be positive' }, { status: 400 });
			}
			if (!['Sent', 'PartPaid'].includes(invoice.status)) {
				return json(
					{ success: false, error: 'Invoice must be approved before a receipt can be recorded' },
					{ status: 400 }
				);
			}

			const remaining = Number(invoice.total - invoice.paidAmount);
			if (amount > remaining) {
				return json({ success: false, error: 'Payment exceeds the outstanding balance' }, { status: 400 });
			}

			const payment = await prisma.payment.create({
				data: {
					publicId: generatePublicId(),
					paymentNumber: await generatePaymentNumber(),
					type: 'Receipt',
					invoiceId: id,
					documentId: toBigInt(body.documentId),
					paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
					amount: BigInt(Math.round(amount)),
					method: body.method ? String(body.method) : 'Bank Transfer',
					reference: body.reference ? String(body.reference) : null
				}
			});

			const paid = Number(invoice.paidAmount) + amount;
			const updated = await prisma.invoice.update({
				where: { id },
				data: {
					paidAmount: BigInt(Math.round(paid)),
					status: paid >= Number(invoice.total) ? 'Paid' : 'PartPaid'
				}
			});

			await postPaymentToFinance(payment.id);

			return json({ success: true, data: serializeBigInt(updated) });
		}

		return json({ success: false, error: 'Unsupported action' }, { status: 400 });
	} catch (error) {
		console.error('Error updating invoice:', error);
		return json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
	}
}
