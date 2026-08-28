import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import type { RequestEvent } from '@sveltejs/kit';

function serialize(value: any): any {
	if (typeof value === 'bigint') return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
	return value;
}

export async function PATCH({ params, request }: RequestEvent) {
	try {
		const requirementId = /^\d+$/.test(params.requirementId!) ? { id: BigInt(params.requirementId!) } : { publicId: params.requirementId! };
		const requirement = await prisma.tenderRequirement.findUnique({ where: requirementId });
		if (!requirement) return json({ error: 'Requirement not found' }, { status: 404 });
		const { status, assignedTo } = await request.json();
		const updated = await prisma.tenderRequirement.update({
			where: { id: requirement.id },
			data: {
				...(status && { status }),
				...(assignedTo !== undefined && { assignedTo: assignedTo ? BigInt(assignedTo) : null }),
				completedAt: status === 'Completed' ? new Date() : status ? null : undefined
			},
			include: { assignee: { select: { id: true, firstname: true, lastname: true } } }
		});
		return json(serialize(updated));
	} catch (error) {
		console.error('Error updating tender requirement:', error);
		return json({ error: 'Failed to update tender requirement' }, { status: 500 });
	}
}