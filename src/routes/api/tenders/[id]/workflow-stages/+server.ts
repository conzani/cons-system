import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

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

// POST create custom workflow stages for a tender
export async function POST({ params, request }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ success: false, error: 'Tender ID required' }, { status: 400 });
		}

		const body = await request.json();
		const { stages } = body;

		if (!stages || !Array.isArray(stages) || stages.length === 0) {
			return json({ success: false, error: 'Stages array required' }, { status: 400 });
		}

		// Try to find by numeric ID first, then by publicId
		let tender;
		try {
			tender = await prisma.tender.findUnique({
				where: { id: BigInt(params.id || '0') }
			});
		} catch (e) {
			tender = await prisma.tender.findUnique({
				where: { publicId: params.id }
			});
		}

		if (!tender) {
			return json({ success: false, error: 'Tender not found' }, { status: 404 });
		}

		const lastStage = await prisma.tenderWorkflowStage.findFirst({
			where: { tenderId: tender.id },
			orderBy: { stageOrder: 'desc' }
		});
		const startingOrder = (lastStage?.stageOrder || 0) + 1;

		// Add custom stages after the existing construction workflow.
		const workflowStages = await prisma.tenderWorkflowStage.createMany({
			data: stages.map((stageName: string, index: number) => ({
				publicId: crypto.randomUUID(),
				tenderId: tender.id,
				stageName: stageName,
				stageOrder: startingOrder + index,
				status: 'Pending'
			}))
		});

		// Fetch the created stages
		const createdStages = await prisma.tenderWorkflowStage.findMany({
			where: { tenderId: tender.id },
			orderBy: { stageOrder: 'asc' }
		});

		// Convert BigInt to String for JSON serialization
		const serializedStages = JSON.parse(JSON.stringify(createdStages, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		));

		return json({ success: true, data: serializedStages, message: 'Custom workflow created successfully' });
	} catch (error) {
		console.error('Error creating custom workflow:', error);
		return json({ success: false, error: 'Failed to create custom workflow' }, { status: 500 });
	}
}

export async function PUT({ params, request }: RequestEvent) {
	try {
		const tender = await findTender(params.id!);
		if (!tender) return json({ error: 'Tender not found' }, { status: 404 });
		const { stageIds } = await request.json();
		if (!Array.isArray(stageIds) || stageIds.length === 0) return json({ error: 'Stage order is required' }, { status: 400 });

		const stages = await prisma.tenderWorkflowStage.findMany({ where: { tenderId: tender.id } });
		const knownIds = new Set(stages.map((stage) => String(stage.id)));
		if (stageIds.length !== stages.length || stageIds.some((id: string) => !knownIds.has(String(id)))) {
			return json({ error: 'Stage order does not match this tender' }, { status: 400 });
		}

		await prisma.$transaction(stageIds.map((stageId: string, index: number) =>
			prisma.tenderWorkflowStage.update({ where: { id: BigInt(stageId) }, data: { stageOrder: index + 1 } })
		));
		const orderedStages = await prisma.tenderWorkflowStage.findMany({ where: { tenderId: tender.id }, orderBy: { stageOrder: 'asc' } });
		return json({ success: true, data: serialize(orderedStages) });
	} catch (error) {
		console.error('Error reordering workflow stages:', error);
		return json({ error: 'Failed to reorder workflow stages' }, { status: 500 });
	}
}
