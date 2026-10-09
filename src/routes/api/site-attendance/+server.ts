import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	// Handle Decimal type first (check both name and methods)
	if (obj && typeof obj === 'object') {
		// Check if it's a Decimal type by checking constructor name or methods
		if (obj.constructor?.name === 'Decimal' || (obj.toNumber && obj.toString && !obj.toISOString)) {
			return Number(obj.toString());
		}
	}

	// Handle other types
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

export async function GET({ url }: RequestEvent) {
	try {
		const siteId = url.searchParams.get('siteId');
		const employeeId = url.searchParams.get('employeeId');
		const date = url.searchParams.get('date');

		const where: any = { deletedAt: null };
		if (siteId) where.siteId = BigInt(siteId);
		if (employeeId) where.employeeId = BigInt(employeeId);
		if (date) where.date = new Date(date);

		const attendance = await prisma.siteAttendance.findMany({
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
				site: {
					select: {
						id: true,
						name: true,
						siteNumber: true
					}
				},
				timesheet: {
					select: {
						id: true,
						status: true,
						regularHours: true,
						overtimeHours: true
					}
				}
			},
			orderBy: { date: 'desc' }
		});



		const serialized = serializeBigInt(attendance);

		return json(serialized);
	} catch (error) {
		console.error('Error fetching site attendance:', error);
		return json({ error: 'Failed to fetch site attendance' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			siteId,
			employeeId,
			date,
			shift,
			startTime,
			endTime,
			breakMinutes,
			attendanceStatus,
			notes
		} = body;

		if (!siteId || !employeeId || !date || !startTime || !endTime) {
			return json({ error: 'Site, employee, date, start time and end time are required' }, { status: 400 });
		}

		// Validate time format (HH:mm)
		if (!/^\d{2}:\d{2}$/.test(String(startTime)) || !/^\d{2}:\d{2}$/.test(String(endTime))) {
			return json({ error: 'Time must be in HH:mm format' }, { status: 400 });
		}

		const start = new Date(`${date}T${startTime}:00`);
		const end = new Date(`${date}T${endTime}:00`);
		
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
			return json({ error: 'Invalid date or time format' }, { status: 400 });
		}
		
		if (end <= start) {
			return json({ error: 'Start time must be earlier than end time' }, { status: 400 });
		}

		const breakMins = Number.parseInt(String(breakMinutes ?? '0'), 10) || 0;
		const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
		const workMinutes = Math.max(totalMinutes - breakMins, 0);
		const hoursWorked = Number.isFinite(workMinutes / 60) ? Number((workMinutes / 60).toFixed(2)) : 0;

		// Validate hoursWorked
		if (!Number.isFinite(hoursWorked) || hoursWorked < 0) {
			return json({ error: 'Invalid hours calculation' }, { status: 400 });
		}

		// Create site attendance record
		const attendance = await prisma.siteAttendance.create({
			data: {
				publicId: generatePublicId(),
				siteId: BigInt(siteId),
				employeeId: BigInt(employeeId),
				date: new Date(date),
				shift: shift || 'Day Shift',
				startTime: start,
				endTime: end,
				breakMinutes: breakMins,
				hoursWorked,
				attendanceStatus: attendanceStatus || 'Present',
				notes: notes || null
			},
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						employeeNumber: true
					}
				},
				site: {
					select: {
						id: true,
						name: true,
						siteNumber: true
					}
				}
			}
		});

		// Sync with timesheet
		try {
			const regularMinutes = Math.min(workMinutes, 8 * 60);
			const overtimeMinutes = Math.max(workMinutes - 8 * 60, 0);
			const regularHours = Number.isFinite(regularMinutes / 60) ? Number((regularMinutes / 60).toFixed(2)) : 0;
			const overtimeHours = Number.isFinite(overtimeMinutes / 60) ? Number((overtimeMinutes / 60).toFixed(2)) : 0;

			const timesheet = await prisma.timesheet.create({
				data: {
					publicId: generatePublicId(),
					employeeId: BigInt(employeeId),
					siteId: BigInt(siteId),
					date: new Date(date),
					startTime: start,
					endTime: end,
					regularHours,
					overtimeHours,
					breakMinutes: breakMins,
					description: notes || `Site attendance: ${shift || 'Day Shift'}`,
					attendanceStatus: attendanceStatus || 'Present',
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

			// Link timesheet to attendance record
			await prisma.siteAttendance.update({
				where: { id: attendance.id },
				data: { timesheetId: timesheet.id }
			});

			// Return attendance with linked timesheet
			const updatedAttendance = await prisma.siteAttendance.findUnique({
				where: { id: attendance.id },
				include: {
					employee: {
						select: {
							id: true,
							firstname: true,
							lastname: true,
							employeeNumber: true
						}
					},
					site: {
						select: {
							id: true,
							name: true,
							siteNumber: true
						}
					},
					timesheet: {
						select: {
							id: true,
							status: true,
							regularHours: true,
							overtimeHours: true
						}
					}
				}
			});

			return json(serializeBigInt(updatedAttendance), { status: 201 });
		} catch (timesheetError) {
			console.error('Error creating timesheet:', timesheetError);
			// Return attendance even if timesheet creation fails
			return json(serializeBigInt(attendance), { status: 201 });
		}
	} catch (error) {
		console.error('Error creating site attendance:', error);
		return json({ error: 'Failed to create site attendance' }, { status: 500 });
	}
}

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { id, attendanceStatus, notes, startTime, endTime, breakMinutes } = body;

		if (!id) {
			return json({ error: 'Attendance ID is required' }, { status: 400 });
		}

		const updateData: any = {};
		if (attendanceStatus) updateData.attendanceStatus = attendanceStatus;
		if (notes !== undefined) updateData.notes = notes;

		// If times are updated, recalculate hours
		if (startTime && endTime) {
			const existingAttendance = await prisma.siteAttendance.findUnique({
				where: { id: BigInt(id) }
			});

			if (existingAttendance) {
				const start = new Date(`${existingAttendance.date.toISOString().split('T')[0]}T${startTime}:00`);
				const end = new Date(`${existingAttendance.date.toISOString().split('T')[0]}T${endTime}:00`);
				const breakMins = Number.parseInt(String(breakMinutes ?? existingAttendance.breakMinutes), 10) || 0;
				const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
				const workMinutes = Math.max(totalMinutes - breakMins, 0);
				const hoursWorked = Number((workMinutes / 60).toFixed(2));

				// Validate hoursWorked
				if (!Number.isFinite(hoursWorked) || hoursWorked < 0) {
					return json({ error: 'Invalid hours calculation' }, { status: 400 });
				}

				updateData.startTime = start;
				updateData.endTime = end;
				updateData.breakMinutes = breakMins;
				updateData.hoursWorked = hoursWorked;

				// Update linked timesheet if exists
				if (existingAttendance.timesheetId) {
					const regularMinutes = Math.min(workMinutes, 8 * 60);
					const overtimeMinutes = Math.max(workMinutes - 8 * 60, 0);
					const regularHours = Number((regularMinutes / 60).toFixed(2));
					const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

					await prisma.timesheet.update({
						where: { id: existingAttendance.timesheetId },
						data: {
							startTime: start,
							endTime: end,
							regularHours,
							overtimeHours,
							breakMinutes: breakMins,
							attendanceStatus: attendanceStatus || existingAttendance.attendanceStatus
						}
					});
				}
			}
		}

		const attendance = await prisma.siteAttendance.update({
			where: { id: BigInt(id) },
			data: updateData,
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						employeeNumber: true
					}
				},
				site: {
					select: {
						id: true,
						name: true,
						siteNumber: true
					}
				},
				timesheet: {
					select: {
						id: true,
						status: true,
						regularHours: true,
						overtimeHours: true
					}
				}
			}
		});

		return json(serializeBigInt(attendance));
	} catch (error) {
		console.error('Error updating site attendance:', error);
		return json({ error: 'Failed to update site attendance' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');

		if (!id) {
			return json({ error: 'Attendance ID is required' }, { status: 400 });
		}

		const attendance = await prisma.siteAttendance.update({
			where: { id: BigInt(id) },
			data: { deletedAt: new Date() }
		});

		return json(serializeBigInt(attendance));
	} catch (error) {
		console.error('Error deleting site attendance:', error);
		return json({ error: 'Failed to delete site attendance' }, { status: 500 });
	}
}