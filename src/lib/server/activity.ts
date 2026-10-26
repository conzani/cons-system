import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

export type ActivityInput = {
	entityType: 'PurchaseOrder' | 'Invoice' | 'Bill' | 'Payment' | 'Payroll' | 'SiteRequest' | 'Document';
	entityId: bigint;
	action: string;
	description: string;
	userId?: bigint | null;
	metadata?: Record<string, unknown>;
};

/** Append-only activity trail for a business record. */
export async function logActivity(input: ActivityInput): Promise<void> {
	try {
		await prisma.recordActivity.create({
			data: {
				publicId: generatePublicId(),
				entityType: input.entityType,
				entityId: input.entityId,
				action: input.action,
				description: input.description,
				userId: input.userId ?? null,
				metadata: input.metadata ? JSON.stringify(input.metadata) : null
			}
		});
	} catch (error) {
		// Auditing must never break the business transaction.
		console.error('Error recording activity:', error);
	}
}

export async function getTimeline(entityType: string, entityId: bigint) {
	return prisma.recordActivity.findMany({
		where: { entityType, entityId },
		orderBy: { createdAt: 'asc' }
	});
}
