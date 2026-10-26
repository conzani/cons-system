import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	clampProgress,
	parseDateOrNull,
	projectIdFromParam,
	serializeBigInt,
	stringOrNull,
	syncProjectProgress
} from '$lib/server/projects';

function phaseWhere(projectId: bigint, phaseParam: string) {
	return {
		projectId,
		deletedAt: null,
		...(/^\d+$/.test(phaseParam) ? { id: BigInt(phaseParam) } : { publicId: phaseParam })
	};
}

export async function PATCH({ params, request }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const existing = await prisma.projectPhase.findFirst({
			where: phaseWhere(projectId, params.phaseId ?? '')
		});
		if (!existing) return json({ success: false, error: 'Phase not found' }, { status: 404 });

		const body = await request.json();
		const data: Record<string, unknown> = {};

		if (body.name !== undefined) {
			const name = stringOrNull(body.name);
			if (!name) return json({ success: false, error: 'Phase name cannot be empty' }, { status: 400 });
			data.name = name;
		}
		if (body.description !== undefined) data.description = stringOrNull(body.description);
		if (body.startDate !== undefined) data.startDate = parseDateOrNull(body.startDate);
		if (body.endDate !== undefined) data.endDate = parseDateOrNull(body.endDate);
		if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

		let progress = existing.progress;
		if (body.progress !== undefined) {
			progress = clampProgress(body.progress);
			data.progress = progress;
		}

		if (body.status !== undefined) {
			data.status = stringOrNull(body.status) ?? 'Planned';
		} else if (body.progress !== undefined) {
			data.status = progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Planned';
		}

		const phase = await prisma.projectPhase.update({
			where: { id: existing.id },
			data
		});

		await syncProjectProgress(projectId);

		return json({ success: true, data: serializeBigInt(phase) });
	} catch (error) {
		console.error('Error updating phase:', error);
		return json({ success: false, error: 'Failed to update phase' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const existing = await prisma.projectPhase.findFirst({
			where: phaseWhere(projectId, params.phaseId ?? '')
		});
		if (!existing) return json({ success: false, error: 'Phase not found' }, { status: 404 });

		await prisma.projectPhase.update({
			where: { id: existing.id },
			data: { deletedAt: new Date() }
		});

		await syncProjectProgress(projectId);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting phase:', error);
		return json({ success: false, error: 'Failed to delete phase' }, { status: 500 });
	}
}
