import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';
import { postEquipmentCost } from '$lib/server/finance';

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const toBigInt = (value: unknown) => (value ? BigInt(String(value)) : null);

export async function GET({ url }: RequestEvent) {
	try {
		const equipmentId = url.searchParams.get('equipmentId');
		const logs = await prisma.equipmentLog.findMany({
			where: equipmentId ? { equipmentId: BigInt(equipmentId) } : {},
			include: { equipment: { select: { id: true, name: true, code: true } } },
			orderBy: { logDate: 'desc' },
			take: 200
		});
		return json({ success: true, data: serializeBigInt(logs) });
	} catch (error) {
		console.error('Error fetching equipment logs:', error);
		return json({ success: false, error: 'Failed to fetch equipment logs' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const equipmentId = toBigInt(body.equipmentId);
		const type = text(body.type) ?? 'Utilisation';

		if (!equipmentId) return json({ success: false, error: 'Equipment is required' }, { status: 400 });
		if (!['Utilisation', 'Fuel', 'Maintenance', 'Repair'].includes(type)) {
			return json({ success: false, error: 'Invalid log type' }, { status: 400 });
		}

		const equipment = await prisma.equipment.findFirst({
			where: { id: equipmentId, deletedAt: null }
		});
		if (!equipment) return json({ success: false, error: 'Equipment not found' }, { status: 404 });

		const hours = body.hours !== undefined && body.hours !== '' ? Number(body.hours) : null;
		const quantity = body.quantity !== undefined && body.quantity !== '' ? Number(body.quantity) : null;
		const unitCost = body.unitCost !== undefined && body.unitCost !== '' ? Math.round(Number(body.unitCost)) : null;

		let cost = body.cost !== undefined && body.cost !== '' ? Math.round(Number(body.cost)) : 0;
		if (!cost && type === 'Fuel' && quantity && unitCost) cost = Math.round(quantity * unitCost);
		if (!cost && type === 'Utilisation' && hours && equipment.hourlyRate) {
			cost = Math.round(hours * Number(equipment.hourlyRate));
		}
		if (!cost && (type === 'Maintenance' || type === 'Repair') && unitCost) {
			cost = Math.round((quantity ?? 1) * unitCost);
		}

		const log = await prisma.equipmentLog.create({
			data: {
				publicId: generatePublicId(),
				equipmentId,
				documentId: toBigInt(body.documentId),
				logDate: body.logDate ? new Date(body.logDate) : new Date(),
				type,
				hours,
				quantity,
				unitCost: unitCost !== null ? BigInt(unitCost) : null,
				cost: BigInt(cost),
				projectId: toBigInt(body.projectId) ?? equipment.projectId,
				siteId: toBigInt(body.siteId) ?? equipment.siteId,
				notes: text(body.notes)
			},
			include: { equipment: { select: { id: true, name: true, code: true } } }
		});

		if (type !== 'Utilisation' && cost > 0) {
			await postEquipmentCost(log.id, {
				equipmentName: equipment.name,
				cost,
				projectId: log.projectId,
				siteId: log.siteId
			});
		}

		if (type === 'Maintenance' || type === 'Repair') {
			await prisma.equipment.update({ where: { id: equipmentId }, data: { status: 'Maintenance' } });
		}

		return json({ success: true, data: serializeBigInt(log) }, { status: 201 });
	} catch (error) {
		console.error('Error creating equipment log:', error);
		return json({ success: false, error: 'Failed to create equipment log' }, { status: 500 });
	}
}
