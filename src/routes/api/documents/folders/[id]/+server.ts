import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') {
		return obj.toString();
	}
	if (Array.isArray(obj)) {
		return obj.map(serializeBigInt);
	}
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export async function PUT({ request, params }: RequestEvent) {
	try {
		const { name, description, parentFolderId, projectId } = await request.json();
		
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);

		const data: any = {};
		if (name) data.name = name;
		if (description !== undefined) data.description = description;
		if (parentFolderId !== undefined) data.parentFolderId = parentFolderId ? BigInt(parentFolderId) : null;
		if (projectId !== undefined) data.projectId = projectId ? BigInt(projectId) : null;

		const folder = await prisma.documentFolder.update({
			where: { id },
			data,
			include: {
				parentFolder: true,
				creator: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				}
			}
		});

		return json(serializeBigInt(folder));
	} catch (error) {
		console.error('Error updating folder:', error);
		return json({ error: 'Failed to update folder' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);

		await prisma.documentFolder.update({
			where: { id },
			data: { deletedAt: new Date() }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting folder:', error);
		return json({ error: 'Failed to delete folder' }, { status: 500 });
	}
}
