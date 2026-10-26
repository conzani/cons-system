import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	clampProgress,
	newPublicId,
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

		const phases = await prisma.projectPhase.findMany({
			where: { projectId, deletedAt: null },
			orderBy: { sortOrder: 'asc' },
			include: {
				milestones: {
					where: { deletedAt: null },
					orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }]
				}
			}
		});

		return json({ success: true, data: serializeBigInt(phases) });
	} catch (error) {
		console.error('Error fetching phases:', error);
		return json({ success: false, error: 'Failed to fetch phases' }, { status: 500 });
	}
}

export async function POST({ params, request }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const body = await request.json();
		const name = stringOrNull(body.name);
		if (!name) return json({ success: false, error: 'Phase name is required' }, { status: 400 });

		const last = await prisma.projectPhase.findFirst({
			where: { projectId },
			orderBy: { sortOrder: 'desc' },
			select: { sortOrder: true }
		});

		const progress = clampProgress(body.progress);
		const phase = await prisma.projectPhase.create({
			data: {
				publicId: newPublicId(),
				projectId,
				name,
				description: stringOrNull(body.description),
				startDate: parseDateOrNull(body.startDate),
				endDate: parseDateOrNull(body.endDate),
				progress,
				status: stringOrNull(body.status) ?? (progress === 0 ? 'Planned' : progress >= 100 ? 'Completed' : 'In Progress'),
				sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : (last?.sortOrder ?? 0) + 1
			}
		});

		await syncProjectProgress(projectId);

		return json({ success: true, data: serializeBigInt(phase) }, { status: 201 });
	} catch (error) {
		console.error('Error creating phase:', error);
		return json({ success: false, error: 'Failed to create phase' }, { status: 500 });
	}
}
