import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import {
	clampProgress,
	newPublicId,
	parseBigIntOrNull,
	parseDateOrNull,
	projectDetailInclude,
	projectIdFromParam,
	serializeBigInt,
	stringOrNull
} from '$lib/server/projects';

export async function GET({ params }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: projectDetailInclude
		});

		return json({ success: true, data: serializeBigInt(project) });
	} catch (error) {
		console.error('Error fetching project:', error);
		return json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
	}
}

export async function PUT({ params, request }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const body = await request.json();
		const data: Prisma.ProjectUpdateInput = {};

		for (const key of ['name', 'description', 'client', 'location', 'projectType', 'contractNumber', 'status']) {
			if (body[key] !== undefined) (data as any)[key] = stringOrNull(body[key]);
		}
		if (body.startDate !== undefined) data.startDate = parseDateOrNull(body.startDate);
		if (body.endDate !== undefined) data.endDate = parseDateOrNull(body.endDate);
		if (body.value !== undefined) data.value = parseBigIntOrNull(body.value);
		if (body.progress !== undefined) data.progress = clampProgress(body.progress);
		if (body.managerId !== undefined) data.managerId = parseBigIntOrNull(body.managerId);

		const project = await prisma.project.update({
			where: { id: projectId },
			data,
			include: projectDetailInclude
		});

		return json({ success: true, data: serializeBigInt(project) });
	} catch (error) {
		console.error('Error updating project:', error);
		return json({ success: false, error: 'Failed to update project' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		await prisma.project.update({
			where: { id: projectId },
			data: { deletedAt: new Date(), status: 'Cancelled' }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting project:', error);
		return json({ success: false, error: 'Failed to delete project' }, { status: 500 });
	}
}
