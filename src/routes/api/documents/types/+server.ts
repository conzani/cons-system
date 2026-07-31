import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';

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
		const documentTypes = await prisma.documentType.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		});
		return json(serializeBigInt(documentTypes));
	} catch (error) {
		console.error('Error fetching document types:', error);
		return json({ error: 'Failed to fetch document types' }, { status: 500 });
	}
}
