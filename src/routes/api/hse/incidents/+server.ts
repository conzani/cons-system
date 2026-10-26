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
		const incidents = await prisma.safetyIncident.findMany({
			where: { deletedAt: null, ...(projectId ? { projectId: BigInt(projectId) } : {}) },
			orderBy: { incidentDate: 'desc' }
		});
		return json({ success: true, data: serializeBigInt(incidents) });
	} catch (error) {
		console.error('Error fetching incidents:', error);
		return json({ success: false, error: 'Failed to fetch incidents' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const description = text(body.description);
		if (!description) {
			return json({ success: false, error: 'Incident description is required' }, { status: 400 });
		}

		const incident = await prisma.safetyIncident.create({
			data: {
				publicId: generatePublicId(),
				incidentNumber: await uniqueDocumentNumber('INC', async (candidate) => {
					const found = await prisma.safetyIncident.findUnique({
						where: { incidentNumber: candidate },
						select: { id: true }
					});
					return !!found;
				}),
				projectId: bigint(body.projectId),
				siteId: bigint(body.siteId),
				documentId: bigint(body.documentId),
				incidentDate: body.incidentDate ? new Date(body.incidentDate) : new Date(),
				type: text(body.type) ?? 'Near Miss',
				severity: text(body.severity) ?? 'Low',
				description,
				status: 'Open',
				lostDays: Number(body.lostDays ?? 0),
				correctiveAction: text(body.correctiveAction),
				reportedBy: text(body.reportedBy)
			}
		});
		return json({ success: true, data: serializeBigInt(incident) }, { status: 201 });
	} catch (error) {
		console.error('Error creating incident:', error);
		return json({ success: false, error: 'Failed to create incident' }, { status: 500 });
	}
}

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		if (!body.id) return json({ success: false, error: 'id is required' }, { status: 400 });

		const incident = await prisma.safetyIncident.update({
			where: { id: BigInt(body.id) },
			data: {
				status: text(body.status) ?? undefined,
				severity: text(body.severity) ?? undefined,
				lostDays: body.lostDays !== undefined ? Number(body.lostDays) : undefined,
				correctiveAction:
					body.correctiveAction !== undefined ? text(body.correctiveAction) : undefined
			}
		});
		return json({ success: true, data: serializeBigInt(incident) });
	} catch (error) {
		console.error('Error updating incident:', error);
		return json({ success: false, error: 'Failed to update incident' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) return json({ success: false, error: 'id is required' }, { status: 400 });
		await prisma.safetyIncident.update({ where: { id: BigInt(id) }, data: { deletedAt: new Date() } });
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting incident:', error);
		return json({ success: false, error: 'Failed to delete incident' }, { status: 500 });
	}
}
