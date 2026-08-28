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

export async function GET({ params }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const requirements = await prisma.tenderRequirement.findMany({ where: { tenderId: tender.id }, include: { assignee: { select: { id: true, firstname: true, lastname: true } } }, orderBy: { createdAt: 'asc' } });
		return json(serialize(requirements));
	} catch (error) {
		console.error('Error fetching tender requirements:', error);
		return json({ error: 'Failed to fetch tender requirements' }, { status: 500 });
	}
}

export async function POST({ params, request }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const { category, item, description, dueDate, assignedTo } = await request.json();
		if (!category || !item) return json({ error: 'Category and item are required' }, { status: 400 });
		const requirement = await prisma.tenderRequirement.create({ data: { publicId: crypto.randomUUID(), tenderId: tender.id, category, item, description: description || null, dueDate: dueDate ? new Date(dueDate) : null, assignedTo: assignedTo ? BigInt(assignedTo) : null }, include: { assignee: { select: { id: true, firstname: true, lastname: true } } } });
		return json(serialize(requirement), { status: 201 });
	} catch (error) {
		console.error('Error creating tender requirement:', error);
		return json({ error: 'Failed to create tender requirement' }, { status: 500 });
	}
}