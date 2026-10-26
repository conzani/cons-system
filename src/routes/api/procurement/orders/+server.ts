import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';
import { generateBillNumber, generatePoNumber, postBillToFinance } from '$lib/server/finance';
import { requestApproval } from '$lib/server/approvals';
import { logActivity } from '$lib/server/activity';

const toBigInt = (value: unknown) => {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
	if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
	return null;
};

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export async function GET({ url }: RequestEvent) {
	try {
		const projectId = url.searchParams.get('projectId');
		const orders = await prisma.purchaseOrder.findMany({
			where: {
				deletedAt: null,
				...(projectId ? { projectId: BigInt(projectId) } : {})
			},
			include: {
				supplier: { select: { id: true, name: true } },
				items: true
			},
			orderBy: { orderDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(orders) });
	} catch (error) {
		console.error('Error fetching purchase orders:', error);
		return json({ success: false, error: 'Failed to fetch purchase orders' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const supplierId = toBigInt(body.supplierId);
		const rawItems = Array.isArray(body.items) ? body.items : [];

		if (!supplierId) return json({ success: false, error: 'Supplier is required' }, { status: 400 });

		const supplier = await prisma.supplier.findFirst({
			where: { id: supplierId, deletedAt: null }
		});
		if (!supplier) return json({ success: false, error: 'Supplier not found' }, { status: 404 });

		const items = rawItems
			.map((item: any) => {
				const description = text(item.description);
				const quantity = Number(item.quantity ?? 0);
				const unitPrice = Number(item.unitPrice ?? 0);
				if (!description || quantity <= 0 || unitPrice < 0) return null;
				return {
					publicId: generatePublicId(),
					description,
					unit: text(item.unit),
					quantity,
					unitPrice: BigInt(Math.round(unitPrice)),
					amount: BigInt(Math.round(quantity * unitPrice))
				};
			})
			.filter(Boolean) as any[];

		if (items.length === 0) {
			return json({ success: false, error: 'At least one valid order line is required' }, { status: 400 });
		}

		const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
		const taxAmount = Math.round(Number(body.taxAmount ?? 0));

		const order = await prisma.purchaseOrder.create({
			data: {
				publicId: generatePublicId(),
				poNumber: await generatePoNumber(),
				supplierId,
				projectId: toBigInt(body.projectId),
				siteId: toBigInt(body.siteId),
				siteRequestId: toBigInt(body.siteRequestId),
				documentId: toBigInt(body.documentId),
				orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
				expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
				status: 'Draft',
				subtotal: BigInt(subtotal),
				taxAmount: BigInt(taxAmount),
				total: BigInt(subtotal + taxAmount),
				notes: text(body.notes),
				createdBy: locals.user?.id,
				items: { create: items }
			},
			include: { supplier: { select: { id: true, name: true } }, items: true }
		});

		await logActivity({
			entityType: 'PurchaseOrder',
			entityId: order.id,
			action: 'created',
			description: `Purchase order ${order.poNumber} created`,
			userId: locals.user?.id,
			metadata: { supplier: supplier.name, total: Number(order.total) }
		});

		return json({ success: true, data: serializeBigInt(order) }, { status: 201 });
	} catch (error) {
		console.error('Error creating purchase order:', error);
		return json({ success: false, error: 'Failed to create purchase order' }, { status: 500 });
	}
}

/**
 * Receiving a PO is the operational hand-off: goods land in the store, an
 * accounts-payable bill is raised, and the ledger records inventory/AP.
 */
export async function PATCH({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const id = toBigInt(body.id);
		if (!id) return json({ success: false, error: 'Purchase order id is required' }, { status: 400 });

		const order = await prisma.purchaseOrder.findUnique({
			where: { id },
			include: { items: true, supplier: true }
		});
		if (!order || order.deletedAt) {
			return json({ success: false, error: 'Purchase order not found' }, { status: 404 });
		}

		if (body.action === 'order') {
			if (!['Draft', 'Rejected'].includes(order.status)) {
				return json({ success: false, error: 'Only a draft order can be submitted for approval' }, { status: 400 });
			}
			const updated = await prisma.purchaseOrder.update({
				where: { id },
				data: { status: 'Pending Approval' }
			});
			await requestApproval('PurchaseOrder', id, locals.user?.id);
			return json({ success: true, data: serializeBigInt(updated) });
		}

		if (body.action === 'cancel') {
			const updated = await prisma.purchaseOrder.update({
				where: { id },
				data: { status: 'Cancelled' }
			});
			await logActivity({
				entityType: 'PurchaseOrder',
				entityId: id,
				action: 'cancelled',
				description: `Purchase order ${order.poNumber} cancelled`,
				userId: locals.user?.id
			});
			return json({ success: true, data: serializeBigInt(updated) });
		}

		if (body.action === 'attach') {
			const documentId = toBigInt(body.documentId);
			const document = documentId
				? await prisma.document.findFirst({ where: { id: documentId, isDeleted: false } })
				: null;
			if (documentId && !document) {
				return json({ success: false, error: 'Document not found' }, { status: 404 });
			}
			const updated = await prisma.purchaseOrder.update({
				where: { id },
				data: { documentId }
			});
			await logActivity({
				entityType: 'PurchaseOrder',
				entityId: id,
				action: documentId ? 'document_attached' : 'document_removed',
				description: documentId
					? `Supporting document attached: ${document?.title ?? documentId}`
					: 'Supporting document removed',
				userId: locals.user?.id,
				metadata: { documentId: documentId?.toString() ?? null }
			});
			return json({ success: true, data: serializeBigInt(updated) });
		}

		if (body.action === 'receive') {
			if (!['Ordered', 'Partially Received'].includes(order.status)) {
				return json({ success: false, error: 'Goods can only be received against an approved/ordered purchase order' }, { status: 400 });
			}

			const warehouseId = toBigInt(body.warehouseId) ?? (await prisma.warehouse.findFirst({ where: { deletedAt: null, status: 'Active' }, orderBy: { id: 'asc' } }))?.id;
			if (!warehouseId) return json({ success: false, error: 'Select a warehouse to receive into' }, { status: 400 });
			const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } });
			if (!warehouse) return json({ success: false, error: 'Warehouse not found' }, { status: 404 });

			const requested = Array.isArray(body.receipts) ? body.receipts : [];
			const requestedMap = new Map<string, number>();
			for (const line of requested) {
				const itemId = toBigInt(line.itemId);
				const quantity = Number(line.quantity ?? 0);
				if (itemId && quantity > 0) requestedMap.set(itemId.toString(), quantity);
			}

			const lines = order.items
				.map((item) => {
					const outstanding = item.quantity - item.receivedQuantity;
					const requestedQuantity = requestedMap.has(item.id.toString())
						? requestedMap.get(item.id.toString())!
						: (requested.length === 0 ? outstanding : 0);
					return { item, quantity: Math.min(requestedQuantity, outstanding) };
				})
				.filter((line) => line.quantity > 0);

			if (lines.length === 0) return json({ success: false, error: 'Enter a quantity to receive for at least one line' }, { status: 400 });

			let receiptNumber = '';
			for (let attempt = 0; attempt < 10 && !receiptNumber; attempt += 1) {
				const candidate = `GRN/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 900000) + 100000)}`;
				const exists = await prisma.goodsReceipt.findUnique({ where: { receiptNumber: candidate }, select: { id: true } });
				if (!exists) receiptNumber = candidate;
			}

			const receipt = await prisma.goodsReceipt.create({
				data: {
					publicId: generatePublicId(),
					receiptNumber,
					purchaseOrderId: order.id,
					warehouseId,
					receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
					documentId: toBigInt(body.grnDocumentId),
					notes: text(body.notes),
					receivedBy: locals.user?.id,
					items: {
						create: lines.map((line) => ({
							publicId: generatePublicId(),
							purchaseOrderItemId: line.item.id,
							quantity: line.quantity,
							unitCost: line.item.unitPrice
						}))
					}
				}
			});

			let receivedValue = 0;
			for (const line of lines) {
				let inventoryItem = await prisma.inventoryItem.findFirst({ where: { name: line.item.description, deletedAt: null } });
				if (!inventoryItem) {
					inventoryItem = await prisma.inventoryItem.create({
						data: {
							publicId: generatePublicId(),
							code: `MAT-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`,
							name: line.item.description,
							unit: line.item.unit ?? 'units',
							unitCost: line.item.unitPrice,
							category: 'Purchased'
						}
					});
				}
				await prisma.stockMovement.create({
					data: {
						publicId: generatePublicId(),
						itemId: inventoryItem.id,
						warehouseId,
						type: 'In',
						quantity: line.quantity,
						unitCost: line.item.unitPrice,
						movementDate: receipt.receiptDate,
						referenceType: 'GoodsReceipt',
						referenceId: receipt.id,
						projectId: order.projectId,
						siteId: order.siteId,
						notes: `Received against ${order.poNumber} (${receipt.receiptNumber})`
					}
				});
				await prisma.purchaseOrderItem.update({
					where: { id: line.item.id },
					data: { receivedQuantity: line.item.receivedQuantity + line.quantity }
				});
				receivedValue += line.quantity * Number(line.item.unitPrice);
			}

			const refreshed = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
			const fullyReceived = refreshed!.items.every((item) => item.receivedQuantity >= item.quantity);

			const bill = await prisma.bill.create({
				data: {
					publicId: generatePublicId(),
					billNumber: await generateBillNumber(),
					supplierId: order.supplierId,
					supplierName: order.supplier.name,
					projectId: order.projectId,
					siteId: order.siteId,
					purchaseOrderId: order.id,
					goodsReceiptId: receipt.id,
					matchStatus: 'Matched',
					documentId: receipt.documentId,
					billDate: receipt.receiptDate,
					description: `Goods receipt ${receipt.receiptNumber} against ${order.poNumber}`,
					subtotal: BigInt(Math.round(receivedValue)),
					taxAmount: 0n,
					total: BigInt(Math.round(receivedValue)),
					status: 'Pending Approval'
				}
			});
			await requestApproval('Bill', bill.id, locals.user?.id);

			const updated = await prisma.purchaseOrder.update({
				where: { id },
				data: { status: fullyReceived ? 'Received' : 'Partially Received', grnDocumentId: receipt.documentId ?? order.grnDocumentId },
				include: { supplier: { select: { id: true, name: true } }, items: true }
			});

			await logActivity({
				entityType: 'PurchaseOrder',
				entityId: id,
				action: 'goods_received',
				description: `${receipt.receiptNumber}: received ${lines.length} line(s), bill ${bill.billNumber} raised`,
				userId: locals.user?.id,
				metadata: { receiptId: receipt.id.toString(), receiptNumber, billId: bill.id.toString(), billNumber: bill.billNumber, grnDocumentId: receipt.documentId?.toString() ?? null }
			});

			return json({ success: true, data: serializeBigInt(updated), billId: bill.id.toString(), receiptId: receipt.id.toString(), receiptNumber });
		}

		return json({ success: false, error: 'Unsupported action' }, { status: 400 });
	} catch (error) {
		console.error('Error updating purchase order:', error);
		return json({ success: false, error: 'Failed to update purchase order' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.purchaseOrder.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date(), status: 'Cancelled' }
		});
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting purchase order:', error);
		return json({ success: false, error: 'Failed to delete purchase order' }, { status: 500 });
	}
}
