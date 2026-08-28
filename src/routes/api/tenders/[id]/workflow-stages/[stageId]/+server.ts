import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// PUT update workflow stage status
export async function PUT({ params, request }: RequestEvent) {
	try {
		const body = await request.json();
		const { status, notes, completedBy } = body;

		if (!status) {
			return json({ success: false, error: 'Status is required' }, { status: 400 });
		}

		const updateData: any = {
			status
		};

		// If status is 'Completed', set completedAt and completedBy
		if (status === 'Completed') {
			updateData.completedAt = new Date();
			if (completedBy) {
				updateData.completedBy = BigInt(completedBy);
			}
		} else {
			// If status is not completed, clear completedAt and completedBy
			updateData.completedAt = null;
			updateData.completedBy = null;
		}

		// Add notes if provided
		if (notes !== undefined) {
			updateData.notes = notes;
		}

		const workflowStage = await prisma.tenderWorkflowStage.update({
			where: { id: BigInt(params.stageId || '0') },
			data: updateData,
			include: {
				completedByUser: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				}
			}
		});

		// Convert BigInt to String for JSON serialization
		const serializedStage = JSON.parse(JSON.stringify(workflowStage, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		));

		return json({ success: true, data: serializedStage });
	} catch (error) {
		console.error('Error updating workflow stage:', error);
		return json({ success: false, error: 'Failed to update workflow stage' }, { status: 500 });
	}
}
