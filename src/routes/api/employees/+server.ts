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
		const employees = await prisma.employee.findMany({
			where: { deletedAt: null },
			include: {
				user: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						email: true
					}
				},
				department: true,
				branch: true
			},
			orderBy: { createdAt: 'desc' }
		});
		return json(serializeBigInt(employees));
	} catch (error) {
		console.error('Error fetching employees:', error);
		return json({ error: 'Failed to fetch employees' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			employeeNumber,
			userId,
			departmentId,
			branchId,
			firstname,
			lastname,
			email,
			phone,
			dateOfBirth,
			gender,
			maritalStatus,
			nationality,
			nationalId,
			passportNumber,
			employmentType,
			paymentType,
			hourlyRate,
			dailyRate,
			monthlySalary,
			hireDate,
			address,
			emergencyContact,
			emergencyPhone,
			profilePicture,
			notes
		} = body;

		const employee = await prisma.employee.create({
			data: {
				publicId: generatePublicId(),
				employeeNumber,
				userId: userId ? BigInt(userId) : null,
				departmentId: departmentId ? BigInt(departmentId) : null,
				branchId: branchId ? BigInt(branchId) : null,
				firstname,
				lastname,
				email,
				phone,
				dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
				gender,
				maritalStatus,
				nationality,
				nationalId,
				passportNumber,
				employmentType,
				paymentType: paymentType || 'Monthly',
				hourlyRate: hourlyRate ? BigInt(hourlyRate) : null,
				dailyRate: dailyRate ? BigInt(dailyRate) : null,
				monthlySalary: monthlySalary ? BigInt(monthlySalary) : null,
				hireDate: new Date(hireDate),
				address,
				emergencyContact,
				emergencyPhone,
				profilePicture,
				notes
			},
			include: {
				user: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						email: true
					}
				},
				department: true,
				branch: true
			}
		});

		return json(serializeBigInt(employee), { status: 201 });
	} catch (error) {
		console.error('Error creating employee:', error);
		return json({ error: 'Failed to create employee' }, { status: 500 });
	}
}
