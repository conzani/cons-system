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
	return /^\d+$/.test(id)
		? prisma.tender.findUnique({ where: { id: BigInt(id) } })
		: prisma.tender.findUnique({ where: { publicId: id } });
}

export async function GET({ params }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const members = await prisma.tenderTeamMember.findMany({
			where: { tenderId: tender.id },
			include: { employee: { include: { user: { select: { id: true, firstname: true, lastname: true } } } } },
			orderBy: { assignedAt: 'asc' }
		});
		return json(serialize(members));
	} catch (error) {
		console.error('Error fetching tender team:', error);
		return json({ error: 'Failed to fetch tender team' }, { status: 500 });
	}
}

export async function POST({ params, request }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const { employeeId, role, responsibilities } = await request.json();
		if (!employeeId || !role) return json({ error: 'Employee and role are required' }, { status: 400 });
		const member = await prisma.tenderTeamMember.create({
			data: { publicId: crypto.randomUUID(), tenderId: tender.id, employeeId: BigInt(employeeId), role, responsibilities: responsibilities || null },
			include: { employee: { include: { user: { select: { id: true, firstname: true, lastname: true } } } } }
		});
		return json(serialize(member), { status: 201 });
	} catch (error) {
		console.error('Error adding tender team member:', error);
		return json({ error: 'Failed to add tender team member' }, { status: 500 });
	}
}