import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') {
		return obj.toString();
	}
	if (Array.isArray(obj)) {
		return obj.map(serializeBigInt);
	}
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export async function GET({ url }: RequestEvent) {
	try {
		const employeeId = url.searchParams.get('employeeId');
		const status = url.searchParams.get('status');

		const where: any = { deletedAt: null };
		if (employeeId) where.employeeId = BigInt(employeeId);
		if (status) where.status = status;

		const timesheets = await prisma.timesheet.findMany({
			where,
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						employeeNumber: true
					}
				},
				approver: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				}
			},
			orderBy: { date: 'desc' }
		});
		return json(serializeBigInt(timesheets));
	} catch (error) {
		console.error('Error fetching timesheets:', error);
		return json({ error: 'Failed to fetch timesheets' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			employeeId,
			projectId,
			siteId,
			date,
			startTime,
			endTime,
			breakMinutes,
			description
		} = body;

		// Calculate hours
		const start = new Date(startTime);
		const end = new Date(endTime);
		const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
		const breakMins = parseInt(breakMinutes) || 0;
		const workMinutes = totalMinutes - breakMins;
		
		const regularHours = Math.max(0, workMinutes / 60);
		const overtimeHours = regularHours > 8 ? regularHours - 8 : 0;
		const regularHoursFinal = regularHours > 8 ? 8 : regularHours;

		const timesheet = await prisma.timesheet.create({
			data: {
				publicId: generatePublicId(),
				employeeId: BigInt(employeeId),
				projectId: projectId ? BigInt(projectId) : null,
				siteId: siteId ? BigInt(siteId) : null,
				date: new Date(date),
				startTime: new Date(startTime),
				endTime: new Date(endTime),
				regularHours: regularHoursFinal.toFixed(2),
				overtimeHours: overtimeHours.toFixed(2),
				breakMinutes: breakMins,
				description,
				status: 'Pending'
			},
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						employeeNumber: true
					}
				}
			}
		});

		return json(serializeBigInt(timesheet), { status: 201 });
	} catch (error) {
		console.error('Error creating timesheet:', error);
		return json({ error: 'Failed to create timesheet' }, { status: 500 });
	}
}
