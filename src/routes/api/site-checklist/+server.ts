import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export async function GET({ url }: RequestEvent) {
	try {
		const siteId = url.searchParams.get('siteId');
		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}

		const items = await prisma.siteChecklistItem.findMany({
			where: { siteId: BigInt(siteId), deletedAt: null },
			orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
		});

		return json(serializeBigInt(items));
	} catch (error) {
		console.error('Error fetching site checklist:', error);
		return json({ error: 'Failed to fetch site checklist' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { siteId, item, category, dueDate } = body;

		if (!siteId || !item) {
			return json({ error: 'siteId and item are required' }, { status: 400 });
		}

		const checklistItem = await prisma.siteChecklistItem.create({
			data: {
				publicId: generatePublicId(),
				siteId: BigInt(siteId),
				item,
				category: category || 'General',
				dueDate: dueDate ? new Date(dueDate) : null
			}
		});

		// Recalculate the site progress based on checklist completion
		const [total, completed] = await Promise.all([
			prisma.siteChecklistItem.count({ where: { siteId: BigInt(siteId), deletedAt: null } }),
			prisma.siteChecklistItem.count({ where: { siteId: BigInt(siteId), deletedAt: null, status: 'Completed' } })
		]);
		const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
		await prisma.site.update({ where: { id: BigInt(siteId) }, data: { progress } });

		return json({ success: true, data: serializeBigInt(checklistItem), progress }, { status: 201 });
	} catch (error) {
		console.error('Error creating checklist item:', error);
		return json({ error: 'Failed to create checklist item' }, { status: 500 });
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'id is required' }, { status: 400 });
		}

		const body = await request.json();
		const { item, category, status, comment, dueDate, completedBy } = body;

		const data: any = {};
		if (item !== undefined) data.item = item;
		if (category !== undefined) data.category = category;
		if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
		if (comment !== undefined) data.comment = comment;

		if (status !== undefined) {
			data.status = status;
			if (status === 'Completed') {
				data.completedAt = new Date();
				// completedBy references a numeric User id; ignore non-numeric values (e.g. UUID public ids)
				if (completedBy !== undefined && completedBy !== null && completedBy !== '' && /^\d+$/.test(String(completedBy))) {
					data.completedBy = BigInt(completedBy);
				}
			} else {
				data.completedAt = null;
				data.completedBy = null;
			}
		}

		const updated = await prisma.siteChecklistItem.update({
			where: { id: BigInt(id) },
			data
		});

		// Recalculate the site progress based on checklist completion
		const siteId = updated.siteId;
		const [total, completed] = await Promise.all([
			prisma.siteChecklistItem.count({ where: { siteId, deletedAt: null } }),
			prisma.siteChecklistItem.count({ where: { siteId, deletedAt: null, status: 'Completed' } })
		]);
		const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
		await prisma.site.update({ where: { id: siteId }, data: { progress } });

		return json({ success: true, data: serializeBigInt(updated), progress });
	} catch (error) {
		console.error('Error updating checklist item:', error);
		return json({ error: 'Failed to update checklist item' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'id is required' }, { status: 400 });
		}

		const deleted = await prisma.siteChecklistItem.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date() }
		});

		// Recalculate the site progress based on checklist completion
		const siteId = deleted.siteId;
		const [total, completed] = await Promise.all([
			prisma.siteChecklistItem.count({ where: { siteId, deletedAt: null } }),
			prisma.siteChecklistItem.count({ where: { siteId, deletedAt: null, status: 'Completed' } })
		]);
		const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
		await prisma.site.update({ where: { id: siteId }, data: { progress } });

		return json({ success: true, progress });
	} catch (error) {
		console.error('Error deleting checklist item:', error);
		return json({ error: 'Failed to delete checklist item' }, { status: 500 });
	}
}
