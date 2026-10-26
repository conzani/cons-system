import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { serializeBigInt } from '$lib/server/projects';
import { uniqueDocumentNumber } from '$lib/server/numbering';

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const bigint = (value: unknown) => (value ? BigInt(String(value)) : null);

export async function GET({ url }: RequestEvent) {
	try {
		const projectId = url.searchParams.get('projectId');
		const inspections = await prisma.inspection.findMany({
			where: { deletedAt: null, ...(projectId ? { projectId: BigInt(projectId) } : {}) },
			orderBy: { inspectionDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(inspections) });
	} catch (error) {
		console.error('Error fetching inspections:', error);
		return json({ success: false, error: 'Failed to fetch inspections' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const inspection = await prisma.inspection.create({
			data: {
				publicId: generatePublicId(),
				inspectionNumber: await uniqueDocumentNumber('INS', async (candidate) => {
					const found = await prisma.inspection.findUnique({
						where: { inspectionNumber: candidate },
						select: { id: true }
					});
					return !!found;
				}),
				projectId: bigint(body.projectId),
				siteId: bigint(body.siteId),
				documentId: bigint(body.documentId),
				type: text(body.type) ?? 'Site',
				inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : new Date(),
				inspectorName: text(body.inspectorName),
				status: text(body.status) ?? 'Pending',
				findings: text(body.findings),
				correctiveAction: text(body.correctiveAction)
			}
		});
		return json({ success: true, data: serializeBigInt(inspection) }, { status: 201 });
	} catch (error) {
		console.error('Error creating inspection:', error);
		return json({ success: false, error: 'Failed to create inspection' }, { status: 500 });
	}
}

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'id is required' }, { status: 400 });

		const inspection = await prisma.inspection.update({
			where: { id: BigInt(body.id) },
			data: {
				status: text(body.status) ?? undefined,
				findings: body.findings !== undefined ? text(body.findings) : undefined,
				correctiveAction:
					body.correctiveAction !== undefined ? text(body.correctiveAction) : undefined
			}
		});
		return json({ success: true, data: serializeBigInt(inspection) });
	} catch (error) {
		console.error('Error updating inspection:', error);
		return json({ success: false, error: 'Failed to update inspection' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.inspection.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date() } });
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting inspection:', error);
		return json({ success: false, error: 'Failed to delete inspection' }, { status: 500 });
	}
}
