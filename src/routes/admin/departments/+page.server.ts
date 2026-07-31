import { prisma } from '$lib/db';

export async function load() {
	try {
		const departments = await prisma.department.findMany({
			include: {
				branch: true
			}
		});
		return { departments };
	} catch (error) {
		console.error('Error loading departments:', error);
		return { departments: [] };
	}
}
