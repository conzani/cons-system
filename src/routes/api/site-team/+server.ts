import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export async function GET({ url }: RequestEvent) {
	try {
		const siteId = url.searchParams.get('siteId');
		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}

		const members = await prisma.siteTeamMember.findMany({
			where: { siteId: BigInt(siteId), deletedAt: null },
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						phone: true,
						email: true,
						department: { select: { name: true } }
					}
				}
			},
			orderBy: { assignedAt: 'desc' }
		});

		return json(serializeBigInt(members));
	} catch (error) {
		console.error('Error fetching site team members:', error);
		return json({ error: 'Failed to fetch site team members' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { siteId, employeeId, role, specialization, phone, status } = body;

		if (!siteId || !employeeId || !role) {
			return json({ error: 'siteId, employeeId and role are required' }, { status: 400 });
		}

		// Prevent duplicate assignment of the same employee to the same site
		const existing = await prisma.siteTeamMember.findFirst({
			where: { siteId: BigInt(siteId), employeeId: BigInt(employeeId), deletedAt: null }
		});
		if (existing) {
			return json({ error: 'This employee is already assigned to this site' }, { status: 409 });
		}

		const member = await prisma.siteTeamMember.create({
			data: {
				publicId: generatePublicId(),
				siteId: BigInt(siteId),
				employeeId: BigInt(employeeId),
				role,
				specialization: specialization || null,
				phone: phone || null,
				status: status || 'Active'
			},
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						phone: true,
						email: true,
						department: { select: { name: true } }
					}
				}
			}
		});

		return json({ success: true, data: serializeBigInt(member) }, { status: 201 });
	} catch (error) {
		console.error('Error adding site team member:', error);
		return json({ error: 'Failed to add site team member' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'id is required' }, { status: 400 });
		}

		await prisma.siteTeamMember.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date(), status: 'Completed' }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error removing site team member:', error);
		return json({ error: 'Failed to remove site team member' }, { status: 500 });
	}
}
