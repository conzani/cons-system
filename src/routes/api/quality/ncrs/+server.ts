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
		const ncrs = await prisma.ncr.findMany({
			where: { deletedAt: null, ...(projectId ? { projectId: BigInt(projectId) } : {}) },
			orderBy: { raisedDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(ncrs) });
	} catch (error) {
		console.error('Error fetching NCRs:', error);
		return json({ success: false, error: 'Failed to fetch NCRs' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const title = text(body.title);
		if (!title) return json({ success: false, error: 'NCR title is required' }, { status: 400 });

		const ncr = await prisma.ncr.create({
			data: {
				publicId: generatePublicId(),
				ncrNumber: await uniqueDocumentNumber('NCR', async (candidate) => {
					const found = await prisma.ncr.findUnique({
						where: { ncrNumber: candidate },
						select: { id: true }
					});
					return !!found;
				}),
				projectId: bigint(body.projectId),
				siteId: bigint(body.siteId),
				documentId: bigint(body.documentId),
				title,
				description: text(body.description),
				severity: text(body.severity) ?? 'Medium',
				status: 'Open',
				raisedDate: body.raisedDate ? new Date(body.raisedDate) : new Date(),
				dueDate: body.dueDate ? new Date(body.dueDate) : null,
				correctiveAction: text(body.correctiveAction)
			}
		});
		return json({ success: true, data: serializeBigInt(ncr) }, { status: 201 });
	} catch (error) {
		console.error('Error creating NCR:', error);
		return json({ success: false, error: 'Failed to create NCR' }, { status: 500 });
	}
}

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'id is required' }, { status: 400 });

		const status = text(body.status);
		const ncr = await prisma.ncr.update({
			where: { id: BigInt(body.id) },
			data: {
				status: status ?? undefined,
				severity: text(body.severity) ?? undefined,
				correctiveAction:
					body.correctiveAction !== undefined ? text(body.correctiveAction) : undefined,
				closedDate: status === 'Closed' ? new Date() : status ? null : undefined
			}
		});
		return json({ success: true, data: serializeBigInt(ncr) });
	} catch (error) {
		console.error('Error updating NCR:', error);
		return json({ success: false, error: 'Failed to update NCR' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.ncr.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date() } });
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting NCR:', error);
		return json({ success: false, error: 'Failed to delete NCR' }, { status: 500 });
	}
}
