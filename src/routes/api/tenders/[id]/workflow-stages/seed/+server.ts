import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// POST seed workflow stages for a tender
export async function POST({ params }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ success: false, error: 'Tender ID required' }, { status: 400 });
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

		// Check if workflow stages already exist
		const existingStages = await prisma.tenderWorkflowStage.findMany({
			where: { tenderId: tender.id }
		});

		if (existingStages.length > 0) {
			// Delete existing stages to reset
			await prisma.tenderWorkflowStage.deleteMany({
				where: { tenderId: tender.id }
			});
		}

		// Create default workflow stages
		const workflowStages = await prisma.tenderWorkflowStage.createMany({
			data: [
				{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Opportunity', stageOrder: 1, status: 'Pending' },
				{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Qualification', stageOrder: 2, status: 'Pending' },
				{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Bid/No-Bid', stageOrder: 3, status: 'Pending' },
				{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Preparation', stageOrder: 4, status: 'Pending' },
				{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Approval', stageOrder: 5, status: 'Pending' },
				{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Submission', stageOrder: 6, status: 'Pending' }
			]
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

		return json({ success: true, data: serializedStages, message: 'Workflow stages seeded successfully' });
	} catch (error) {
		console.error('Error seeding workflow stages:', error);
		return json({ success: false, error: 'Failed to seed workflow stages' }, { status: 500 });
	}
}
