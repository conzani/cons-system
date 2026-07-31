import { prisma } from '$lib/db';

export async function load() {
	try {
		const branches = await prisma.branch.findMany();
		return { branches };
	} catch (error) {
		console.error('Error loading branches:', error);
		return { branches: [] };
	}
}
