import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export async function GET({ url }: RequestEvent) {
	try {
		const search = url.searchParams.get('search')?.trim();
		const suppliers = await prisma.supplier.findMany({
			where: {
				deletedAt: null,
				...(search ? { name: { contains: search } } : {})
			},
			include: { _count: { select: { purchaseOrders: true, bills: true } } },
			orderBy: { name: 'asc' }
		});
		return json({ success: true, data: serializeBigInt(suppliers) });
	} catch (error) {
		console.error('Error fetching suppliers:', error);
		return json({ success: false, error: 'Failed to fetch suppliers' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const name = text(body.name);
		if (!name) return json({ success: false, error: 'Supplier name is required' }, { status: 400 });

		const supplier = await prisma.supplier.create({
			data: {
				publicId: generatePublicId(),
				name,
				category: text(body.category),
				contactName: text(body.contactName),
				phone: text(body.phone),
				email: text(body.email),
				address: text(body.address),
				taxId: text(body.taxId),
				status: text(body.status) ?? 'Active'
			}
		});

		return json({ success: true, data: serializeBigInt(supplier) }, { status: 201 });
	} catch (error) {
		console.error('Error creating supplier:', error);
		return json({ success: false, error: 'Failed to create supplier' }, { status: 500 });
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'Supplier id is required' }, { status: 400 });

		const supplier = await prisma.supplier.update({
			where: { id: BigInt(body.id) },
			data: {
				name: text(body.name) ?? undefined,
				category: text(body.category),
				contactName: text(body.contactName),
				phone: text(body.phone),
				email: text(body.email),
				address: text(body.address),
				taxId: text(body.taxId),
				status: text(body.status) ?? undefined
			}
		});

		return json({ success: true, data: serializeBigInt(supplier) });
	} catch (error) {
		console.error('Error updating supplier:', error);
		return json({ success: false, error: 'Failed to update supplier' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.supplier.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date(), status: 'Inactive' } });
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting supplier:', error);
		return json({ success: false, error: 'Failed to delete supplier' }, { status: 500 });
	}
}
