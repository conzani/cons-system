import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') {
		return obj.toString();
	}
	if (obj instanceof Date) {
		return obj.toISOString();
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
		const id = url.searchParams.get('id');
		const publicId = url.searchParams.get('publicId');
		const forBidManager = url.searchParams.get('forBidManager') === 'true';
		
		if (id) {
			// Fetch single employee by ID (for backward compatibility)
			const employee = await prisma.employee.findUnique({
				where: { 
					id: BigInt(id),
					deletedAt: null
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
					branch: true,
					documents: {
						where: { isDeleted: false },
						include: {
							documentType: true
						},
						orderBy: { createdAt: 'desc' }
					}
				}
			});
			
			if (!employee) {
				return json({ error: 'Employee not found' }, { status: 404 });
			}
			
			return json(serializeBigInt(employee));
		}
		
		if (publicId) {
			// Fetch single employee by publicId
			const employee = await prisma.employee.findUnique({
				where: { 
					publicId,
					deletedAt: null
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
					branch: true,
					documents: {
						where: { isDeleted: false },
						include: {
							documentType: true
						},
						orderBy: { createdAt: 'desc' }
					}
				}
			});
			
			if (!employee) {
				return json({ error: 'Employee not found' }, { status: 404 });
			}
			
			return json(serializeBigInt(employee));
		}
		
		// Fetch all employees
		const employees = await prisma.employee.findMany({
			where: { deletedAt: null, ...(forBidManager ? { userId: { not: null } } : {}) },
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

export async function PUT({ request, url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const publicId = url.searchParams.get('publicId');
		
		if (!id && !publicId) {
			return json({ error: 'Employee ID or Public ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const {
			employeeNumber,
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
			idType,
			idNumber,
			employmentType,
			employmentStatus,
			paymentType,
			hourlyRate,
			dailyRate,
			monthlySalary,
			hireDate,
			address,
			emergencyContact,
			emergencyPhone,
			profilePicture,
			notes,
			paymentMethod,
			paymentMethodName,
			accountName,
			accountNumber
		} = body;

		// Validate required fields only if they're being updated
		if (firstname !== undefined && !firstname) {
			return json({ error: 'First name is required' }, { status: 400 });
		}
		if (lastname !== undefined && !lastname) {
			return json({ error: 'Last name is required' }, { status: 400 });
		}

		const whereClause = id ? { id: BigInt(id) } : { publicId: publicId! };

		const employee = await prisma.employee.update({
			where: whereClause,
			data: {
				employeeNumber,
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
				idType,
				idNumber,
				employmentType,
				employmentStatus,
				paymentType: paymentType || 'Monthly',
				hourlyRate: hourlyRate ? BigInt(hourlyRate) : null,
				dailyRate: dailyRate ? BigInt(dailyRate) : null,
				monthlySalary: monthlySalary ? BigInt(monthlySalary) : null,
				hireDate: hireDate ? new Date(hireDate) : undefined,
				address,
				emergencyContact,
				emergencyPhone,
				profilePicture,
				notes,
				paymentMethod,
				paymentMethodName,
				accountName,
				accountNumber
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

		return json(serializeBigInt(employee));
	} catch (error) {
		console.error('Error updating employee:', error);
		return json({ error: 'Failed to update employee' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			employeeNumber,
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
			idType,
			idNumber,
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
			notes,
			paymentMethod,
			paymentMethodName,
			accountName,
			accountNumber
		} = body;

		// Validate required fields
		if (!firstname || !lastname) {
			return json({ error: 'First name and last name are required' }, { status: 400 });
		}

		if (!hireDate) {
			return json({ error: 'Hire date is required' }, { status: 400 });
		}

		const employee = await prisma.employee.create({
			data: {
				publicId: generatePublicId(),
				employeeNumber,
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
				idType,
				idNumber,
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
				notes,
				paymentMethod,
				paymentMethodName,
				accountName,
				accountNumber
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
