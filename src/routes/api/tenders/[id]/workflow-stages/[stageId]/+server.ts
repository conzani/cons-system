import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import type { RequestEvent } from '@sveltejs/kit';

function serialize(value: any): any {
	if (typeof value === 'bigint') return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
	return value;
}

export async function PATCH({ params, request, locals }: RequestEvent) {
	try {
		const stageId = /^\d+$/.test(params.stageId!) ? { id: BigInt(params.stageId!) } : { publicId: params.stageId! };
		const stage = await prisma.tenderWorkflowStage.findUnique({ where: stageId });
		if (!stage) return json({ error: 'Workflow stage not found' }, { status: 404 });
		const { status, notes } = await request.json();
		if (!['Pending', 'In Progress', 'Completed'].includes(status)) return json({ error: 'Invalid workflow status' }, { status: 400 });
		const updated = await prisma.$transaction(async (transaction) => {
			const stages = await transaction.tenderWorkflowStage.findMany({ where: { tenderId: stage.tenderId }, orderBy: { stageOrder: 'asc' } });
			const stageIndex = stages.findIndex((item) => item.id === stage.id);
			const hasIncompletePreviousStage = stages.slice(0, stageIndex).some((item) => item.status !== 'Completed');
			if (status === 'Completed' && hasIncompletePreviousStage) {
				throw new Error('Complete the previous workflow stage first');
			}
			const result = await transaction.tenderWorkflowStage.update({ where: { id: stage.id }, data: { status, notes: notes ?? undefined, completedAt: status === 'Completed' ? new Date() : null, completedBy: status === 'Completed' ? (locals.user?.id ?? BigInt(1)) : null } });
			const completed = stages.filter((item) => item.id === stage.id ? status === 'Completed' : item.status === 'Completed').length;
			await transaction.tender.update({ where: { id: stage.tenderId }, data: { progress: stages.length ? Math.round((completed / stages.length) * 100) : 0 } });
			return result;
		});
		return json(serialize(updated));
	} catch (error) {
		console.error('Error updating workflow stage:', error);
		if (error instanceof Error && error.message === 'Complete the previous workflow stage first') {
			return json({ error: error.message }, { status: 400 });
		}
		return json({ error: 'Failed to update workflow stage' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		const stageId = /^\d+$/.test(params.stageId!) ? { id: BigInt(params.stageId!) } : { publicId: params.stageId! };
		const stage = await prisma.tenderWorkflowStage.findUnique({ where: stageId });
		if (!stage) return json({ error: 'Workflow stage not found' }, { status: 404 });
		await prisma.$transaction(async (transaction) => {
			await transaction.tenderWorkflowStage.delete({ where: { id: stage.id } });
			const remaining = await transaction.tenderWorkflowStage.findMany({ where: { tenderId: stage.tenderId }, orderBy: { stageOrder: 'asc' } });
			await Promise.all(remaining.map((remainingStage, index) => transaction.tenderWorkflowStage.update({ where: { id: remainingStage.id }, data: { stageOrder: index + 1 } })));
			const completed = remaining.filter((remainingStage) => remainingStage.status === 'Completed').length;
			await transaction.tender.update({ where: { id: stage.tenderId }, data: { progress: remaining.length ? Math.round((completed / remaining.length) * 100) : 0 } });
		});
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting workflow stage:', error);
		return json({ error: 'Failed to delete workflow stage' }, { status: 500 });
	}
}
