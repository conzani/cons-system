import { prisma } from '$lib/db';

export async function load() {
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
		return { roles };
	} catch (error) {
		console.error('Error loading roles:', error);
		return { roles: [] };
	}
}
