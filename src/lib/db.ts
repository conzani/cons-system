import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// A dev server that was started before `prisma generate` keeps the old client in
// memory, so new models are undefined at runtime. Fail loudly with the fix.
if (process.env.NODE_ENV !== 'production') {
	const requiredModels = [
		'project',
		'projectPhase',
		'journalEntry',
		'invoice',
		'bill',
		'inspection',
		'equipment'
	];
	const missing = requiredModels.filter((model) => !(model in (prisma as unknown as Record<string, unknown>)));
	if (missing.length > 0) {
		console.error(
			`[prisma] Stale Prisma Client (missing: ${missing.join(', ')}). ` +
				'Run "npx prisma generate" and restart the dev server.'
		);
	}
}
