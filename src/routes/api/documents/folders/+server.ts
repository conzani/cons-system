import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
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

export async function GET() {
	try {
		const folders = await prisma.documentFolder.findMany({
			where: { deletedAt: null },
			include: {
				parentFolder: true,
				creator: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				}
			},
			orderBy: { name: 'asc' }
		});
		return json(serializeBigInt(folders));
	} catch (error) {
		console.error('Error fetching folders:', error);
		return json({ error: 'Failed to fetch folders' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const { name, description, parentFolderId, projectId, createdBy } = await request.json();

		if (!name || !createdBy) {
			return json({ error: 'Name and createdBy are required' }, { status: 400 });
		}

		const data: any = {
			name,
			createdBy: BigInt(createdBy)
		};

		if (description) data.description = description;
		if (parentFolderId) data.parentFolderId = BigInt(parentFolderId);
		if (projectId) data.projectId = BigInt(projectId);

		const folder = await prisma.documentFolder.create({
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

		return json(serializeBigInt(folder), { status: 201 });
	} catch (error) {
		console.error('Error creating folder:', error);
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
		return json({ error: 'Failed to create folder', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
	}
}
