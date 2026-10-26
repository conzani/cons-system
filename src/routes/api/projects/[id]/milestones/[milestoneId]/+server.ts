import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	parseBigIntOrNull,
	parseDateOrNull,
	projectIdFromParam,
	serializeBigInt,
	stringOrNull,
	syncProjectProgress
} from '$lib/server/projects';

function milestoneWhere(projectId: bigint, milestoneParam: string) {
	return {
		projectId,
		deletedAt: null,
		...(/^\d+$/.test(milestoneParam)
			? { id: BigInt(milestoneParam) }
			: { publicId: milestoneParam })
	};
}

export async function PATCH({ params, request }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const existing = await prisma.projectMilestone.findFirst({
			where: milestoneWhere(projectId, params.milestoneId ?? '')
		});
		if (!existing) return json({ success: false, error: 'Milestone not found' }, { status: 404 });

		const body = await request.json();
		const data: Record<string, unknown> = {};

		if (body.name !== undefined) {
			const name = stringOrNull(body.name);
			if (!name) return json({ success: false, error: 'Milestone name cannot be empty' }, { status: 400 });
			data.name = name;
		}
		if (body.description !== undefined) data.description = stringOrNull(body.description);
		if (body.dueDate !== undefined) data.dueDate = parseDateOrNull(body.dueDate);

		if (body.phaseId !== undefined) {
			const phaseId = parseBigIntOrNull(body.phaseId);
			if (phaseId) {
				const phase = await prisma.projectPhase.findFirst({
					where: { id: phaseId, projectId, deletedAt: null },
					select: { id: true }
				});
				if (!phase) {
					return json({ success: false, error: 'Phase does not belong to this project' }, { status: 400 });
				}
			}
			data.phaseId = phaseId;
		}

		if (body.status !== undefined) {
			const status = stringOrNull(body.status) ?? 'Pending';
			data.status = status;
			data.completedAt = status === 'Completed' ? existing.completedAt ?? new Date() : null;
		}

		const milestone = await prisma.projectMilestone.update({
			where: { id: existing.id },
			data
		});

		await syncProjectProgress(projectId);

		return json({ success: true, data: serializeBigInt(milestone) });
	} catch (error) {
		console.error('Error updating milestone:', error);
		return json({ success: false, error: 'Failed to update milestone' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const existing = await prisma.projectMilestone.findFirst({
			where: milestoneWhere(projectId, params.milestoneId ?? '')
		});
		if (!existing) return json({ success: false, error: 'Milestone not found' }, { status: 404 });

		await prisma.projectMilestone.update({
			where: { id: existing.id },
			data: { deletedAt: new Date() }
		});

		await syncProjectProgress(projectId);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting milestone:', error);
		return json({ success: false, error: 'Failed to delete milestone' }, { status: 500 });
	}
}
