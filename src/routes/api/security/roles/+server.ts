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
		const roles = await prisma.role.findMany({
			include: {
				rolesPermissions: {
					include: {
						permission: true
					}
				}
			}
		});
		return json(serializeBigInt(roles));
	} catch (error) {
		console.error('Error fetching roles:', error);
		return json({ error: 'Failed to fetch roles' }, { status: 500 });
	}
}
