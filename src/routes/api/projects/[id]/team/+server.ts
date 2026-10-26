import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	newPublicId,
	parseBigIntOrNull,
	projectIdFromParam,
	serializeBigInt,
	stringOrNull
} from '$lib/server/projects';

const memberInclude = {
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
} as const;

export async function GET({ params }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const members = await prisma.projectTeamMember.findMany({
			where: { projectId, deletedAt: null },
			include: memberInclude,
			orderBy: { assignedAt: 'asc' }
		});

		return json({ success: true, data: serializeBigInt(members) });
	} catch (error) {
		console.error('Error fetching project team:', error);
		return json({ success: false, error: 'Failed to fetch project team' }, { status: 500 });
	}
}

export async function POST({ params, request }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const body = await request.json();
		const employeeId = parseBigIntOrNull(body.employeeId);
		const role = stringOrNull(body.role);

		if (!employeeId) return json({ success: false, error: 'Employee is required' }, { status: 400 });
		if (!role) return json({ success: false, error: 'Role is required' }, { status: 400 });

		const employee = await prisma.employee.findFirst({
			where: { id: employeeId, deletedAt: null },
			select: { id: true }
		});
		if (!employee) return json({ success: false, error: 'Employee not found' }, { status: 404 });

		const duplicate = await prisma.projectTeamMember.findFirst({
			where: { projectId, employeeId, deletedAt: null },
			select: { id: true }
		});
		if (duplicate) {
			return json({ success: false, error: 'This employee is already on the project team' }, { status: 409 });
		}

		const member = await prisma.projectTeamMember.create({
			data: {
				publicId: newPublicId(),
				projectId,
				employeeId,
				role,
				status: stringOrNull(body.status) ?? 'Active'
			},
			include: memberInclude
		});

		return json({ success: true, data: serializeBigInt(member) }, { status: 201 });
	} catch (error) {
		console.error('Error adding project team member:', error);
		return json({ success: false, error: 'Failed to add team member' }, { status: 500 });
	}
}

export async function DELETE({ params, url }: RequestEvent) {
	try {
		const projectId = await projectIdFromParam(params.id ?? '');
		if (!projectId) return json({ success: false, error: 'Project not found' }, { status: 404 });

		const memberId = parseBigIntOrNull(url.searchParams.get('memberId'));
		if (!memberId) return json({ success: false, error: 'memberId is required' }, { status: 400 });

		const member = await prisma.projectTeamMember.findFirst({
			where: { id: memberId, projectId, deletedAt: null },
			select: { id: true }
		});
		if (!member) return json({ success: false, error: 'Team member not found' }, { status: 404 });

		await prisma.projectTeamMember.update({
			where: { id: member.id },
			data: { deletedAt: new Date(), status: 'Completed' }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error removing project team member:', error);
		return json({ success: false, error: 'Failed to remove team member' }, { status: 500 });
	}
}
