import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const bigint = (value: unknown) => (value ? BigInt(String(value)) : null);

export async function GET({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (id) {
			const equipment = await prisma.equipment.findUnique({
				where: { id: BigInt(id) },
				include: { logs: { orderBy: { logDate: 'desc' }, take: 50 } }
			});
			if (!equipment) return json({ success: false, error: 'Equipment not found' }, { status: 404 });
			return json({ success: true, data: serializeBigInt(equipment) });
		}

		const equipment = await prisma.equipment.findMany({
			where: { deletedAt: null },
			include: { _count: { select: { logs: true } } },
			orderBy: { name: 'asc' }
		});

		return json({ success: true, data: serializeBigInt(equipment) });
	} catch (error) {
		console.error('Error fetching equipment:', error);
		return json({ success: false, error: 'Failed to fetch equipment' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const name = text(body.name);
		if (!name) return json({ success: false, error: 'Equipment name is required' }, { status: 400 });

		const equipment = await prisma.equipment.create({
			data: {
				publicId: generatePublicId(),
				code: text(body.code) ?? `EQ-${Date.now().toString().slice(-6)}`,
				name,
				category: text(body.category),
				ownership: text(body.ownership) ?? 'Owned',
				status: text(body.status) ?? 'Active',
				hourlyRate: body.hourlyRate ? BigInt(Math.round(Number(body.hourlyRate))) : null,
				dailyRate: body.dailyRate ? BigInt(Math.round(Number(body.dailyRate))) : null,
				purchaseValue: body.purchaseValue ? BigInt(Math.round(Number(body.purchaseValue))) : null,
				acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : null,
				projectId: bigint(body.projectId),
				siteId: bigint(body.siteId),
				notes: text(body.notes)
			}
		});

		return json({ success: true, data: serializeBigInt(equipment) }, { status: 201 });
	} catch (error) {
		console.error('Error creating equipment:', error);
		return json({ success: false, error: 'Failed to create equipment' }, { status: 500 });
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'id is required' }, { status: 400 });

		const equipment = await prisma.equipment.update({
			where: { id: BigInt(body.id) },
			data: {
				name: text(body.name) ?? undefined,
				category: text(body.category),
				ownership: text(body.ownership) ?? undefined,
				status: text(body.status) ?? undefined,
				hourlyRate: body.hourlyRate !== undefined ? (body.hourlyRate ? BigInt(Math.round(Number(body.hourlyRate))) : null) : undefined,
				dailyRate: body.dailyRate !== undefined ? (body.dailyRate ? BigInt(Math.round(Number(body.dailyRate))) : null) : undefined,
				projectId: body.projectId !== undefined ? bigint(body.projectId) : undefined,
				siteId: body.siteId !== undefined ? bigint(body.siteId) : undefined,
				notes: text(body.notes)
			}
		});

		return json({ success: true, data: serializeBigInt(equipment) });
	} catch (error) {
		console.error('Error updating equipment:', error);
		return json({ success: false, error: 'Failed to update equipment' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.equipment.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date(), status: 'Off-hire' }
		});
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting equipment:', error);
		return json({ success: false, error: 'Failed to delete equipment' }, { status: 500 });
	}
}
