import { prisma } from '$lib/db';

export async function load() {
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
		return { permissions };
	} catch (error) {
		console.error('Error loading permissions:', error);
		return { permissions: [] };
	}
}
