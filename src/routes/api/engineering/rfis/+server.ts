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
		const rfis = await prisma.rfi.findMany({
			where: { deletedAt: null, ...(projectId ? { projectId: BigInt(projectId) } : {}) },
			orderBy: { raisedDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(rfis) });
	} catch (error) {
		console.error('Error fetching RFIs:', error);
		return json({ success: false, error: 'Failed to fetch RFIs' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const subject = text(body.subject);
		const question = text(body.question);
		if (!subject || !question) {
			return json({ success: false, error: 'Subject and question are required' }, { status: 400 });
		}

		const rfi = await prisma.rfi.create({
			data: {
				publicId: generatePublicId(),
				rfiNumber: await uniqueDocumentNumber('RFI', async (candidate) => {
					const found = await prisma.rfi.findUnique({
						where: { rfiNumber: candidate },
						select: { id: true }
					});
					return !!found;
				}),
				projectId: bigint(body.projectId),
				siteId: bigint(body.siteId),
				subject,
				question,
				status: 'Open',
				raisedBy: text(body.raisedBy),
				assignedTo: text(body.assignedTo),
				raisedDate: body.raisedDate ? new Date(body.raisedDate) : new Date(),
				dueDate: body.dueDate ? new Date(body.dueDate) : null,
				documentId: bigint(body.documentId)
			}
		});
		return json({ success: true, data: serializeBigInt(rfi) }, { status: 201 });
	} catch (error) {
		console.error('Error creating RFI:', error);
		return json({ success: false, error: 'Failed to create RFI' }, { status: 500 });
	}
}

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'id is required' }, { status: 400 });

		const response = body.response !== undefined ? text(body.response) : undefined;
		const status = text(body.status) ?? (response ? 'Answered' : undefined);

		const rfi = await prisma.rfi.update({
			where: { id: BigInt(body.id) },
			data: {
				response,
				status: status ?? undefined,
				answeredDate: status === 'Answered' || status === 'Closed' ? new Date() : undefined,
				assignedTo: body.assignedTo !== undefined ? text(body.assignedTo) : undefined
			}
		});
		return json({ success: true, data: serializeBigInt(rfi) });
	} catch (error) {
		console.error('Error updating RFI:', error);
		return json({ success: false, error: 'Failed to update RFI' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.rfi.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date() } });
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting RFI:', error);
		return json({ success: false, error: 'Failed to delete RFI' }, { status: 500 });
	}
}
