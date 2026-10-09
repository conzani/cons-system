import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	// Handle Decimal type (checks both name and methods since constructor name is minified to 'i')
	if (obj && typeof obj === 'object') {
		if (obj.constructor?.name === 'Decimal' || (obj.toNumber && obj.toString && !obj.toISOString)) {
			return Number(obj.toString());
		}
	}
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
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

		const serialized = serializeBigInt(timesheets);
		return json(serialized);
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
			description,
			attendanceStatus
		} = body;

		if (!employeeId || !date || !startTime || !endTime) {
			return json({ error: 'Employee, date, start time and end time are required' }, { status: 400 });
		}

		const start = new Date(`${date}T${startTime}:00`);
		const end = new Date(`${date}T${endTime}:00`);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
			return json({ error: 'Start time must be earlier than end time' }, { status: 400 });
		}

		const breakMins = Number.parseInt(String(breakMinutes ?? '0'), 10) || 0;
		const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
		const workMinutes = Math.max(totalMinutes - breakMins, 0);
		const regularMinutes = Math.min(workMinutes, 8 * 60);
		const overtimeMinutes = Math.max(workMinutes - 8 * 60, 0);
		const regularHours = Number((regularMinutes / 60).toFixed(2));
		const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

		const timesheet = await prisma.timesheet.create({
			data: {
				publicId: generatePublicId(),
				employeeId: BigInt(employeeId),
				projectId: projectId ? BigInt(projectId) : null,
				siteId: siteId ? BigInt(siteId) : null,
				date: new Date(date),
				startTime: start,
				endTime: end,
				regularHours,
				overtimeHours,
				breakMinutes: breakMins,
				description: description ?? null,
				attendanceStatus: attendanceStatus ?? 'Present',
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

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { id, status, approvedBy, attendanceStatus } = body;

		if (!id) {
			return json({ error: 'Timesheet ID is required' }, { status: 400 });
		}

		const timesheet = await prisma.timesheet.update({
			where: { id: BigInt(id) },
			data: {
				status: status ?? 'Pending',
				attendanceStatus: attendanceStatus ?? undefined,
				approvedBy: approvedBy ? BigInt(approvedBy) : undefined,
				approvedAt: status ? new Date() : undefined
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

		return json(serializeBigInt(timesheet));
	} catch (error) {
		console.error('Error updating timesheet:', error);
		return json({ error: 'Failed to update timesheet' }, { status: 500 });
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { action } = body;

		// Recalculate all timesheet hours from startTime and endTime
		if (action === 'recalculate-all') {
			const timesheets = await prisma.timesheet.findMany({
				where: { deletedAt: null }
			});

			for (const timesheet of timesheets) {
				if (timesheet.startTime && timesheet.endTime) {
					const totalMinutes = (timesheet.endTime.getTime() - timesheet.startTime.getTime()) / (1000 * 60);
					const breakMins = timesheet.breakMinutes || 0;
					const workMinutes = Math.max(totalMinutes - breakMins, 0);
					const regularMinutes = Math.min(workMinutes, 8 * 60);
					const overtimeMinutes = Math.max(workMinutes - 8 * 60, 0);
					const regularHours = Number((regularMinutes / 60).toFixed(2));
					const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

					await prisma.timesheet.update({
						where: { id: timesheet.id },
						data: {
							regularHours,
							overtimeHours
						}
					});
				}
			}

			return json({ success: true, message: `Recalculated ${timesheets.length} timesheets` });
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('Error in PUT request:', error);
		return json({ error: 'Failed to process request' }, { status: 500 });
	}
}
