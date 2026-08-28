import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

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

		// Delete existing stages
		await prisma.tenderWorkflowStage.deleteMany({
			where: { tenderId: tender.id }
		});

		// Create custom workflow stages
		const workflowStages = await prisma.tenderWorkflowStage.createMany({
			data: stages.map((stageName: string, index: number) => ({
				publicId: crypto.randomUUID(),
				tenderId: tender.id,
				stageName: stageName,
				stageOrder: index + 1,
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
