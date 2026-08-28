import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import type { RequestEvent } from '@sveltejs/kit';

function serialize(value: any): any {
	if (typeof value === 'bigint') return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(serialize);
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
	return value;
}

async function findTender(id: string) {
	return /^\d+$/.test(id) ? prisma.tender.findUnique({ where: { id: BigInt(id) } }) : prisma.tender.findUnique({ where: { publicId: id } });
}

const includeUsers = { sender: { select: { id: true, firstname: true, lastname: true } }, recipient: { select: { id: true, firstname: true, lastname: true } } };

export async function GET({ params }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const communications = await prisma.tenderCommunication.findMany({ where: { tenderId: tender.id }, include: includeUsers, orderBy: { createdAt: 'desc' } });
		return json(serialize(communications));
	} catch (error) {
		console.error('Error fetching tender communications:', error);
		return json({ error: 'Failed to fetch tender communications' }, { status: 500 });
	}
}

export async function POST({ params, request, locals }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const { subject, message, recipientId, isInternal = true } = await request.json();
		if (!subject || !message) return json({ error: 'Subject and message are required' }, { status: 400 });
		const senderId = locals.user?.id ?? BigInt(1);
		const communication = await prisma.tenderCommunication.create({ data: { publicId: crypto.randomUUID(), tenderId: tender.id, subject, message, senderId, recipientId: recipientId ? BigInt(recipientId) : null, isInternal }, include: includeUsers });
		return json(serialize(communication), { status: 201 });
	} catch (error) {
		console.error('Error creating tender communication:', error);
		return json({ error: 'Failed to create tender communication' }, { status: 500 });
	}
}