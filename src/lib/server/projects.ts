import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';
import type { Prisma } from '@prisma/client';

export function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export function stringOrNull(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function parseBigIntOrNull(value: unknown): bigint | null {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
	if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim());
	return null;
}

export function parseDateOrNull(value: unknown): Date | null {
	if (value === null || value === undefined || value === '') return null;
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
}

export function clampProgress(value: unknown): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function projectWhere(idParam: string) {
	return /^\d+$/.test(idParam) ? { id: BigInt(idParam) } : { publicId: idParam };
}

export async function projectIdFromParam(idParam: string): Promise<bigint | null> {
	const project = await prisma.project.findFirst({
		where: { ...projectWhere(idParam), deletedAt: null },
		select: { id: true }
	});
	return project?.id ?? null;
}

export async function generateProjectNumber(): Promise<string> {
	const year = new Date().getFullYear();
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const serial = String(Math.floor(Math.random() * 90000) + 10000);
		const candidate = `PRJ/${year}/${serial}`;
		const existing = await prisma.project.findUnique({
			where: { projectNumber: candidate },
			select: { id: true }
		});
		if (!existing) return candidate;
	}
	throw new Error('Unable to generate a unique project number');
}

/**
 * Keeps the project's headline progress in step with its phases (or, when no
 * phases exist yet, with the share of completed milestones).
 */
export async function syncProjectProgress(projectId: bigint): Promise<void> {
	const [phases, milestones] = await Promise.all([
		prisma.projectPhase.findMany({
			where: { projectId, deletedAt: null },
			select: { progress: true }
		}),
		prisma.projectMilestone.findMany({
			where: { projectId, deletedAt: null },
			select: { status: true }
		})
	]);

	let progress: number | null = null;
	if (phases.length > 0) {
		progress = Math.round(phases.reduce((sum, phase) => sum + phase.progress, 0) / phases.length);
	} else if (milestones.length > 0) {
		const completed = milestones.filter((milestone) => milestone.status === 'Completed').length;
		progress = Math.round((completed / milestones.length) * 100);
	}

	if (progress === null) return;
	await prisma.project.update({ where: { id: projectId }, data: { progress } });
}

export const projectListInclude = {
	tenders: {
		where: { deletedAt: null },
		select: { id: true, publicId: true, tenderNumber: true, title: true, status: true, value: true }
	},
	sites: {
		where: { deletedAt: null },
		select: { id: true, publicId: true, siteNumber: true, name: true, status: true, progress: true }
	},
	_count: {
		select: {
			documents: { where: { isDeleted: false } },
			phases: { where: { deletedAt: null } },
			teamMembers: { where: { deletedAt: null } }
		}
	}
} satisfies Prisma.ProjectInclude;

export const projectDetailInclude = {
	tenders: {
		where: { deletedAt: null },
		select: {
			id: true,
			publicId: true,
			tenderNumber: true,
			title: true,
			client: true,
			status: true,
			value: true,
			closingDate: true
		}
	},
	sites: {
		where: { deletedAt: null },
		select: {
			id: true,
			publicId: true,
			siteNumber: true,
			name: true,
			location: true,
			status: true,
			progress: true,
			value: true
		}
	},
	phases: {
		where: { deletedAt: null },
		orderBy: { sortOrder: 'asc' }
	},
	milestones: {
		where: { deletedAt: null },
		orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }]
	},
	teamMembers: {
		where: { deletedAt: null },
		include: {
			employee: {
				select: {
					id: true,
					publicId: true,
					employeeNumber: true,
					firstname: true,
					lastname: true,
					email: true,
					phone: true
				}
			}
		},
		orderBy: { assignedAt: 'asc' }
	},
	_count: {
		select: {
			documents: { where: { isDeleted: false } }
		}
	}
} satisfies Prisma.ProjectInclude;

export function newPublicId(): string {
	return generatePublicId();
}
