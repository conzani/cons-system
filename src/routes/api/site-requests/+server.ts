import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name === 'Decimal') return Number(obj.toString());
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

function toBigIntOrNull(value: any): bigint | null {
	if (value === undefined || value === null || value === '') return null;
	if (!/^\d+$/.test(String(value))) return null;
	return BigInt(value);
}

export async function GET({ url }: RequestEvent) {
	try {
		const siteId = url.searchParams.get('siteId');
		const id = url.searchParams.get('id');

		if (id) {
			const request = await prisma.siteRequest.findUnique({
				where: { id: BigInt(id) },
				include: { items: { orderBy: { createdAt: 'asc' } } }
			});
			if (!request) return json({ error: 'Request not found' }, { status: 404 });
			return json(serializeBigInt(request));
		}

		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}

		const requests = await prisma.siteRequest.findMany({
			where: { siteId: BigInt(siteId), deletedAt: null },
			include: { items: { orderBy: { createdAt: 'asc' } } },
			orderBy: { createdAt: 'desc' }
		});

		return json(serializeBigInt(requests));
	} catch (error) {
		console.error('Error fetching site requests:', error);
		return json({ error: 'Failed to fetch site requests' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		console.log('POST site request received');
		const body = await request.json();
		console.log('Request body:', body);
		const { siteId, requestType, urgency, reason, neededBy, requestedBy, items } = body;

		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}
		if (!Array.isArray(items) || items.length === 0) {
			return json({ error: 'At least one item is required' }, { status: 400 });
		}

		const validItems = items.filter((it: any) => it.description && String(it.description).trim());
		if (validItems.length === 0) {
			return json({ error: 'At least one item with a description is required' }, { status: 400 });
		}

		const estimatedTotal = validItems.reduce((sum: number, it: any) => {
			const qty = Number(it.quantity) || 0;
			const price = Number(it.estimatedPrice) || 0;
			return sum + qty * price;
		}, 0);

		const requestNumber = `REQ/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 90000) + 10000)}`;

		console.log('Creating site request with data:', { siteId, requestType, urgency, estimatedTotal, validItems });

		const siteRequest = await prisma.siteRequest.create({
			data: {
				publicId: generatePublicId(),
				siteId: BigInt(siteId),
				requestNumber,
				requestType: requestType || 'Material',
				urgency: urgency || 'Normal',
				reason: reason || null,
				neededBy: neededBy ? new Date(neededBy) : null,
				estimatedTotal: BigInt(Math.round(estimatedTotal)),
				requestedBy: toBigIntOrNull(requestedBy),
				items: {
					create: validItems.map((it: any) => ({
						publicId: generatePublicId(),
						description: String(it.description).trim(),
						unit: it.unit || null,
						quantity: Number(it.quantity) || 1,
						estimatedPrice: it.estimatedPrice ? BigInt(Math.round(Number(it.estimatedPrice))) : null,
						notes: it.notes || null
					}))
				}
			},
			include: { items: true }
		});

		console.log('Site request created successfully');

		// Manual serialization to avoid BigInt issues
		const serializedData = {
			id: siteRequest.id.toString(),
			publicId: siteRequest.publicId,
			siteId: siteRequest.siteId.toString(),
			requestNumber: siteRequest.requestNumber,
			requestType: siteRequest.requestType,
			urgency: siteRequest.urgency,
			reason: siteRequest.reason,
			neededBy: siteRequest.neededBy?.toISOString(),
			estimatedTotal: siteRequest.estimatedTotal?.toString() || '0',
			requestedBy: siteRequest.requestedBy?.toString(),
			status: siteRequest.status,
			deliveryNotes: siteRequest.deliveryNotes,
			rejectionReason: siteRequest.rejectionReason,
			approvedAt: siteRequest.approvedAt?.toISOString(),
			approvedBy: siteRequest.approvedBy?.toString(),
			createdAt: siteRequest.createdAt.toISOString(),
			updatedAt: siteRequest.updatedAt.toISOString(),
			deletedAt: siteRequest.deletedAt?.toISOString(),
			items: siteRequest.items.map((item: any) => ({
				id: item.id.toString(),
				publicId: item.publicId,
				description: item.description,
				unit: item.unit,
				quantity: item.quantity,
				estimatedPrice: item.estimatedPrice?.toString(),
				notes: item.notes,
				createdAt: item.createdAt.toISOString()
			}))
		};

		return json({ success: true, data: serializedData }, { status: 201 });
	} catch (error) {
		console.error('Error creating site request:', error);
		console.error('Error details:', {
			message: (error as Error).message,
			stack: (error as Error).stack,
		 name: (error as Error).name
		});
		return json({ error: 'Failed to create site request: ' + (error as Error).message }, { status: 500 });
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'id is required' }, { status: 400 });
		}

		const body = await request.json();
		const { action, approvedBy, rejectionReason, deliveryNotes, urgency, neededBy, reason } = body;

		const data: any = {};
		if (urgency !== undefined) data.urgency = urgency;
		if (reason !== undefined) data.reason = reason;
		if (neededBy !== undefined) data.neededBy = neededBy ? new Date(neededBy) : null;
		if (deliveryNotes !== undefined) data.deliveryNotes = deliveryNotes;

		// Status workflow actions
		if (action === 'approve') {
			data.status = 'Approved';
			data.approvedAt = new Date();
			data.approvedBy = toBigIntOrNull(approvedBy);
			data.rejectionReason = null;
		} else if (action === 'reject') {
			data.status = 'Rejected';
			data.rejectionReason = rejectionReason || null;
			data.approvedAt = null;
			data.approvedBy = null;
		} else if (action === 'order') {
			data.status = 'Ordered';
		} else if (action === 'deliver') {
			data.status = 'Delivered';
		} else if (action === 'cancel') {
			data.status = 'Cancelled';
		} else if (action === 'reopen') {
			data.status = 'Pending';
			data.approvedAt = null;
			data.approvedBy = null;
			data.rejectionReason = null;
		}

		const updated = await prisma.siteRequest.update({
			where: { id: BigInt(id) },
			data,
			include: { items: { orderBy: { createdAt: 'asc' } } }
		});

		return json({ success: true, data: serializeBigInt(updated) });
	} catch (error) {
		console.error('Error updating site request:', error);
		return json({ error: 'Failed to update site request' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'id is required' }, { status: 400 });
		}

		await prisma.siteRequest.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date(), status: 'Cancelled' }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting site request:', error);
		return json({ error: 'Failed to delete site request' }, { status: 500 });
	}
}
