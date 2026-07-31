import { prisma } from '$lib/db';

export async function load() {
	try {
		const company = await prisma.company.findFirst();
		return { company };
	} catch (error) {
		console.error('Error loading company profile:', error);
		return { company: null };
	}
}
