import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { Prisma } from '@prisma/client';
import {
	clampProgress,
	generateProjectNumber,
	newPublicId,
	parseBigIntOrNull,
	parseDateOrNull,
	projectDetailInclude,
	projectListInclude,
	projectWhere,
	serializeBigInt,
	stringOrNull
} from '$lib/server/projects';

export async function GET({ url }: RequestEvent) {
	try {
		const idParam = url.searchParams.get('publicId') ?? url.searchParams.get('id');
		if (idParam) {
			const project = await prisma.project.findFirst({
				where: { ...projectWhere(idParam), deletedAt: null },
				include: projectDetailInclude
			});
			if (!project) return json({ success: false, error: 'Project not found' }, { status: 404 });
			return json({ success: true, data: serializeBigInt(project) });
		}

		const search = url.searchParams.get('search')?.trim() ?? '';
		const status = url.searchParams.get('status') ?? '';
		const client = url.searchParams.get('client')?.trim() ?? '';

		const where: Prisma.ProjectWhereInput = { deletedAt: null };
		if (status) where.status = status;
		if (client) where.client = { contains: client };
		if (search) {
			where.OR = [
				{ name: { contains: search } },
				{ client: { contains: search } },
				{ projectNumber: { contains: search } },
				{ location: { contains: search } }
			];
		}

		const projects = await prisma.project.findMany({
			where,
			include: projectListInclude,
			orderBy: { createdAt: 'desc' }
		});

		return json({ success: true, data: serializeBigInt(projects) });
	} catch (error) {
		console.error('Error fetching projects:', error);
		return json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const name = stringOrNull(body.name);
		if (!name) {
			return json({ success: false, error: 'Project name is required' }, { status: 400 });
		}

		const projectNumber = stringOrNull(body.projectNumber) ?? (await generateProjectNumber());

		const project = await prisma.project.create({
			data: {
				publicId: newPublicId(),
				projectNumber,
				name,
				description: stringOrNull(body.description),
				client: stringOrNull(body.client),
				location: stringOrNull(body.location),
				startDate: parseDateOrNull(body.startDate),
				endDate: parseDateOrNull(body.endDate),
				value: parseBigIntOrNull(body.value),
				status: stringOrNull(body.status) ?? 'Active',
				progress: clampProgress(body.progress),
				projectType: stringOrNull(body.projectType),
				contractNumber: stringOrNull(body.contractNumber),
				managerId: parseBigIntOrNull(body.managerId)
			},
			include: projectDetailInclude
		});

		const tenderId = parseBigIntOrNull(body.tenderId);
		if (tenderId) {
			await prisma.tender.update({
				where: { id: tenderId },
				data: { projectId: project.id }
			});
		}

		return json({ success: true, data: serializeBigInt(project) }, { status: 201 });
	} catch (error) {
		console.error('Error creating project:', error);
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			return json({ success: false, error: 'Project number already exists' }, { status: 409 });
		}
		return json({ success: false, error: 'Failed to create project' }, { status: 500 });
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const idParam = url.searchParams.get('publicId') ?? url.searchParams.get('id');
		if (!idParam) {
			return json({ success: false, error: 'Project id is required' }, { status: 400 });
		}

		const existing = await prisma.project.findFirst({
			where: { ...projectWhere(idParam), deletedAt: null },
			select: { id: true }
		});
		if (!existing) {
			return json({ success: false, error: 'Project not found' }, { status: 404 });
		}

		const body = await request.json();
		const data: Prisma.ProjectUpdateInput = {};

		const textFields = [
			['name', 'name'],
			['description', 'description'],
			['client', 'client'],
			['location', 'location'],
			['projectType', 'projectType'],
			['contractNumber', 'contractNumber']
		] as const;
		for (const [key, column] of textFields) {
			if (body[key] !== undefined) {
				(data as any)[column] = stringOrNull(body[key]);
			}
		}

		if (data.name === null) {
			return json({ success: false, error: 'Project name cannot be empty' }, { status: 400 });
		}

		if (body.status !== undefined) data.status = stringOrNull(body.status) ?? 'Active';
		if (body.progress !== undefined) data.progress = clampProgress(body.progress);
		if (body.startDate !== undefined) data.startDate = parseDateOrNull(body.startDate);
		if (body.endDate !== undefined) data.endDate = parseDateOrNull(body.endDate);
		if (body.value !== undefined) data.value = parseBigIntOrNull(body.value);
		if (body.managerId !== undefined) data.managerId = parseBigIntOrNull(body.managerId);

		const project = await prisma.project.update({
			where: { id: existing.id },
			data,
			include: projectDetailInclude
		});

		const tenderId = parseBigIntOrNull(body.tenderId);
		if (tenderId) {
			await prisma.tender.update({ where: { id: tenderId }, data: { projectId: project.id } });
		}

		return json({ success: true, data: serializeBigInt(project) });
	} catch (error) {
		console.error('Error updating project:', error);
		return json({ success: false, error: 'Failed to update project' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const idParam = url.searchParams.get('publicId') ?? url.searchParams.get('id');
		if (!idParam) {
			return json({ success: false, error: 'Project id is required' }, { status: 400 });
		}

		const existing = await prisma.project.findFirst({
			where: { ...projectWhere(idParam), deletedAt: null },
			select: { id: true }
		});
		if (!existing) {
			return json({ success: false, error: 'Project not found' }, { status: 404 });
		}

		await prisma.$transaction([
			prisma.site.updateMany({
				where: { projectId: existing.id },
				data: { projectId: null }
			}),
			prisma.tender.updateMany({
				where: { projectId: existing.id },
				data: { projectId: null }
			}),
			prisma.project.update({
				where: { id: existing.id },
				data: { deletedAt: new Date(), status: 'Cancelled' }
			})
		]);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting project:', error);
		return json({ success: false, error: 'Failed to delete project' }, { status: 500 });
	}
}
