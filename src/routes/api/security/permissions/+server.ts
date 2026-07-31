import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const permissions = await prisma.permission.findMany({
			include: {
				rolesPermissions: {
					include: {
						role: true
					}
				}
			}
		});
		return json(permissions);
	} catch (error) {
		console.error('Error fetching permissions:', error);
		return json({ error: 'Failed to fetch permissions' }, { status: 500 });
	}
}
