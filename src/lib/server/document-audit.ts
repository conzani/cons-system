import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

export function requestMeta(request: Request): { ipAddress: string | null; device: string | null } {
	const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	return {
		ipAddress: forwarded || request.headers.get('x-real-ip') || null,
		device: request.headers.get('user-agent')?.slice(0, 250) ?? null
	};
}

export async function createActivityLog(
	documentId: bigint,
	userId: bigint,
	action: string,
	meta: { ipAddress: string | null; device: string | null },
	oldValue?: string,
	newValue?: string
): Promise<void> {
	try {
		await prisma.documentActivityLog.create({
			data: {
				publicId: generatePublicId(),
				documentId,
				userId,
				action,
				oldValue,
				newValue,
				ipAddress: meta.ipAddress,
				device: meta.device
			}
		});
	} catch (error) {
		// Activity logging must never break the main operation.
		console.error('Error creating activity log:', error);
	}
}
