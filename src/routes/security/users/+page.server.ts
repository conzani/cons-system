import { prisma } from '$lib/db';

export async function load() {
	try {
		const [users, roles, departments, branches] = await Promise.all([
			prisma.user.findMany({
				include: {
					role: true,
					department: true,
					branch: true
				}
			}),
			prisma.role.findMany(),
			prisma.department.findMany(),
			prisma.branch.findMany()
		]);
		
		return { users, roles, departments, branches };
	} catch (error) {
		console.error('Error loading users:', error);
		return { users: [], roles: [], departments: [], branches: [] };
	}
}
