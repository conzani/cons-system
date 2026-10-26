import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	newPublicId,
	parseBigIntOrNull,
	parseDateOrNull,
	projectIdFromParam,
	serializeBigInt,
	stringOrNull,
	syncProjectProgress
} from '$lib/server/projects';

export async function GET({ params }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const milestones = await prisma.projectMilestone.findMany({
			where: { projectId, deletedAt: null },
			orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }]
		});

		return json({ success: true, data: serializeBigInt(milestones) });
	} catch (error) {
		console.error('Error fetching milestones:', error);
		return json({ success: false, error: 'Failed to fetch milestones' }, { status: 500 });
	}
}

export async function POST({ params, request }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const body = await request.json();
		const name = stringOrNull(body.name);
		if (!name) return json({ success: false, error: 'Milestone name is required' }, { status: 400 });

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

		const status = stringOrNull(body.status) ?? 'Pending';
		const milestone = await prisma.projectMilestone.create({
			data: {
				publicId: newPublicId(),
				projectId,
				phaseId,
				name,
				description: stringOrNull(body.description),
				dueDate: parseDateOrNull(body.dueDate),
				status,
				completedAt: status === 'Completed' ? new Date() : null,
				sortOrder: Number(body.sortOrder) || 0
			}
		});

		await syncProjectProgress(projectId);

		return json({ success: true, data: serializeBigInt(milestone) }, { status: 201 });
	} catch (error) {
		console.error('Error creating milestone:', error);
		return json({ success: false, error: 'Failed to create milestone' }, { status: 500 });
	}
}
