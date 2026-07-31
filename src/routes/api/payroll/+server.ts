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

		const payrollRecords = await prisma.payroll.findMany({
			where,
			include: {
				employee: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						employeeNumber: true,
						paymentType: true,
						hourlyRate: true,
						dailyRate: true,
						monthlySalary: true
					}
				}
			},
			orderBy: { payPeriodStart: 'desc' }
		});
		return json(serializeBigInt(payrollRecords));
	} catch (error) {
		console.error('Error fetching payroll records:', error);
		return json({ error: 'Failed to fetch payroll records' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			employeeId,
			payPeriodStart,
			payPeriodEnd,
			regularHours,
			overtimeHours,
			allowances,
			deductions,
			bonuses
		} = body;

		// Get employee details for calculation
		const employee = await prisma.employee.findUnique({
			where: { id: BigInt(employeeId) }
		});

		if (!employee) {
			return json({ error: 'Employee not found' }, { status: 404 });
		}

		// Calculate pay based on payment type
		let regularPay = BigInt(0);
		let overtimePay = BigInt(0);

		if (employee.paymentType === 'Hourly' && employee.hourlyRate) {
			const hourlyRate = employee.hourlyRate;
			regularPay = (hourlyRate * BigInt(Math.floor(parseFloat(regularHours) * 100))) / BigInt(100);
			overtimePay = (hourlyRate * BigInt(150) * BigInt(Math.floor(parseFloat(overtimeHours) * 100))) / BigInt(10000); // 1.5x overtime rate
		} else if (employee.paymentType === 'Daily' && employee.dailyRate) {
			const dailyRate = employee.dailyRate;
			regularPay = (dailyRate * BigInt(Math.floor(parseFloat(regularHours) / 8 * 100))) / BigInt(100); // Assume 8 hours per day
		} else if (employee.paymentType === 'Monthly' && employee.monthlySalary) {
			regularPay = employee.monthlySalary;
		}

		const grossPay = regularPay + overtimePay + BigInt(allowances || 0) + BigInt(bonuses || 0);
		const taxAmount = grossPay / BigInt(10); // Simple 10% tax calculation
		const netPay = grossPay - taxAmount - BigInt(deductions || 0);

		const payroll = await prisma.payroll.create({
			data: {
				publicId: generatePublicId(),
				employeeId: BigInt(employeeId),
				payPeriodStart: new Date(payPeriodStart),
				payPeriodEnd: new Date(payPeriodEnd),
				paymentType: employee.paymentType,
				regularHours: parseFloat(regularHours).toFixed(2),
				overtimeHours: parseFloat(overtimeHours).toFixed(2),
				regularPay,
				overtimePay,
				allowances: BigInt(allowances || 0),
				deductions: BigInt(deductions || 0),
				bonuses: BigInt(bonuses || 0),
				grossPay,
				taxAmount,
				netPay,
				status: 'Draft'
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

		return json(serializeBigInt(payroll), { status: 201 });
	} catch (error) {
		console.error('Error creating payroll record:', error);
		return json({ error: 'Failed to create payroll record' }, { status: 500 });
	}
}
