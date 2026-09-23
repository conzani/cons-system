import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name === 'Decimal') return obj.toString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

function toNumber(value: unknown, fallback = 0) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return fallback;
		const num = Number.parseFloat(trimmed);
		return Number.isFinite(num) ? num : fallback;
	}
	if (value && typeof value === 'object') {
		const str = String(value);
		if (str === '[object Object]') return fallback;
		const num = Number.parseFloat(str);
		return Number.isFinite(num) ? num : fallback;
	}
	return fallback;
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
			bonuses,
			salaryType,
			taxPercentage,
			pension,
			insurance
		} = body;

		if (!employeeId || !payPeriodStart || !payPeriodEnd) {
			return json({ error: 'Employee and pay period are required' }, { status: 400 });
		}

		const employee = await prisma.employee.findUnique({
			where: { id: BigInt(employeeId) }
		});

		if (!employee) {
			return json({ error: 'Employee not found' }, { status: 404 });
		}

		const regularHoursNumber = toNumber(regularHours, 0);
		const overtimeHoursNumber = toNumber(overtimeHours, 0);
		const allowancesNumber = toNumber(allowances, 0);
		const deductionsNumber = toNumber(deductions, 0);
		const bonusesNumber = toNumber(bonuses, 0);
		const taxPercentageValue = toNumber(taxPercentage, 0);
		const pensionAmount = Math.round(toNumber(pension, 0));
		const insuranceAmount = Math.round(toNumber(insurance, 0));
		const selectedSalaryType = salaryType === 'Net' ? 'Net' : 'Gross';

		let regularPay = 0;
		let overtimePay = 0;
		let grossPay = 0;
		let taxAmount = 0;
		let netPay = 0;
		const hourlyRate = Number(employee.hourlyRate ?? 0);
		const dailyRate = Number(employee.dailyRate ?? 0);
		const monthlySalary = Number(employee.monthlySalary ?? 0);

		if (employee.paymentType === 'Hourly') {
			regularPay = hourlyRate * regularHoursNumber;
			overtimePay = hourlyRate * 1.5 * overtimeHoursNumber;
			grossPay = Math.round(regularPay + overtimePay + allowancesNumber + bonusesNumber);
			taxAmount = Math.round(grossPay * (taxPercentageValue > 0 ? taxPercentageValue / 100 : 0.1));
			netPay = Math.max(grossPay - taxAmount - deductionsNumber - pensionAmount - insuranceAmount, 0);
		} else if (employee.paymentType === 'Daily') {
			const workDays = regularHoursNumber / 8;
			const overtimeDays = overtimeHoursNumber / 8;
			regularPay = dailyRate * workDays;
			overtimePay = dailyRate * 1.5 * overtimeDays;
			grossPay = Math.round(regularPay + overtimePay + allowancesNumber + bonusesNumber);
			taxAmount = Math.round(grossPay * (taxPercentageValue > 0 ? taxPercentageValue / 100 : 0.1));
			netPay = Math.max(grossPay - taxAmount - deductionsNumber - pensionAmount - insuranceAmount, 0);
		} else {
			const monthlyBase = monthlySalary || 0;
			const computedTax = monthlyBase * (taxPercentageValue > 0 ? taxPercentageValue / 100 : 0);
			const monthlyGross = selectedSalaryType === 'Net' ? monthlyBase + computedTax + pensionAmount + insuranceAmount : monthlyBase;
			const monthlyNet = selectedSalaryType === 'Net' ? monthlyBase : Math.max(monthlyGross - computedTax - pensionAmount - insuranceAmount, 0);
			regularPay = Math.round(monthlyBase);
			overtimePay = 0;
			grossPay = Math.round(monthlyGross);
			taxAmount = Math.round(computedTax);
			netPay = Math.round(monthlyNet);
		}

		const payroll = await prisma.payroll.create({
			data: {
				publicId: generatePublicId(),
				employeeId: BigInt(employeeId),
				payPeriodStart: new Date(payPeriodStart),
				payPeriodEnd: new Date(payPeriodEnd),
				paymentType: employee.paymentType,
				salaryType: selectedSalaryType,
				taxPercentage: taxPercentageValue || null,
				pensionAmount: pensionAmount || null,
				insuranceAmount: insuranceAmount || null,
				regularHours: Number(regularHoursNumber.toFixed(2)),
				overtimeHours: Number(overtimeHoursNumber.toFixed(2)),
				regularPay: Math.round(regularPay),
				overtimePay: Math.round(overtimePay),
				allowances: Math.round(allowancesNumber),
				deductions: Math.round(deductionsNumber),
				bonuses: Math.round(bonusesNumber),
				grossPay: Math.round(grossPay),
				taxAmount: Math.round(taxAmount),
				netPay: Math.round(netPay),
				status: 'Calculated'
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

export async function PATCH({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			id,
			status,
			employeeId,
			payPeriodStart,
			payPeriodEnd,
			regularHours,
			overtimeHours,
			allowances,
			deductions,
			bonuses,
			salaryType,
			taxPercentage,
			pension,
			insurance
		} = body;

		if (!id) {
			return json({ error: 'Payroll ID is required' }, { status: 400 });
		}

		const existingPayroll = await prisma.payroll.findUnique({
			where: { id: BigInt(id) },
			include: { employee: true }
		});

		if (!existingPayroll) {
			return json({ error: 'Payroll record not found' }, { status: 404 });
		}

		if (!employeeId && !payPeriodStart && !payPeriodEnd && !regularHours && !overtimeHours && !allowances && !deductions && !bonuses && !salaryType && !taxPercentage && !pension && !insurance && status) {
			const payroll = await prisma.payroll.update({
				where: { id: BigInt(id) },
				data: {
					status: status ?? 'Calculated',
					paidAt: status === 'Paid' ? new Date() : null
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
			return json(serializeBigInt(payroll));
		}

		const employee = employeeId ? await prisma.employee.findUnique({ where: { id: BigInt(employeeId) } }) : existingPayroll.employee;
		if (!employee) {
			return json({ error: 'Employee not found' }, { status: 404 });
		}

		const regularHoursNumber = toNumber(regularHours ?? existingPayroll.regularHours, 0);
		const overtimeHoursNumber = toNumber(overtimeHours ?? existingPayroll.overtimeHours, 0);
		const allowancesNumber = toNumber(allowances ?? existingPayroll.allowances, 0);
		const deductionsNumber = toNumber(deductions ?? existingPayroll.deductions, 0);
		const bonusesNumber = toNumber(bonuses ?? existingPayroll.bonuses, 0);
		const taxPercentageValue = toNumber(taxPercentage ?? existingPayroll.taxPercentage ?? 0, 0);
		const pensionAmount = Math.round(toNumber(pension ?? existingPayroll.pensionAmount ?? 0, 0));
		const insuranceAmount = Math.round(toNumber(insurance ?? existingPayroll.insuranceAmount ?? 0, 0));
		const selectedSalaryType = salaryType === 'Net' ? 'Net' : 'Gross';

		const employeePaymentType = employee.paymentType ?? existingPayroll.paymentType;
		const hourlyRate = Number(employee.hourlyRate ?? 0);
		const dailyRate = Number(employee.dailyRate ?? 0);
		const monthlySalary = Number(employee.monthlySalary ?? 0);

		let regularPay = Number(existingPayroll.regularPay ?? 0);
		let overtimePay = Number(existingPayroll.overtimePay ?? 0);
		let grossPay = Number(existingPayroll.grossPay ?? 0);
		let taxAmount = Number(existingPayroll.taxAmount ?? 0);
		let netPay = Number(existingPayroll.netPay ?? 0);

		if (employeePaymentType === 'Hourly') {
			regularPay = hourlyRate * regularHoursNumber;
			overtimePay = hourlyRate * 1.5 * overtimeHoursNumber;
			grossPay = Math.round(regularPay + overtimePay + allowancesNumber + bonusesNumber);
			taxAmount = Math.round(grossPay * (taxPercentageValue > 0 ? taxPercentageValue / 100 : 0.1));
			netPay = Math.max(grossPay - taxAmount - deductionsNumber - pensionAmount - insuranceAmount, 0);
		} else if (employeePaymentType === 'Daily') {
			const workDays = regularHoursNumber / 8;
			const overtimeDays = overtimeHoursNumber / 8;
			regularPay = dailyRate * workDays;
			overtimePay = dailyRate * 1.5 * overtimeDays;
			grossPay = Math.round(regularPay + overtimePay + allowancesNumber + bonusesNumber);
			taxAmount = Math.round(grossPay * (taxPercentageValue > 0 ? taxPercentageValue / 100 : 0.1));
			netPay = Math.max(grossPay - taxAmount - deductionsNumber - pensionAmount - insuranceAmount, 0);
		} else {
			const monthlyBase = monthlySalary || 0;
			const computedTax = monthlyBase * (taxPercentageValue > 0 ? taxPercentageValue / 100 : 0);
			const monthlyGross = selectedSalaryType === 'Net' ? monthlyBase + computedTax + pensionAmount + insuranceAmount : monthlyBase;
			const monthlyNet = selectedSalaryType === 'Net' ? monthlyBase : Math.max(monthlyGross - computedTax - pensionAmount - insuranceAmount, 0);
			regularPay = Math.round(monthlyBase);
			overtimePay = 0;
			grossPay = Math.round(monthlyGross);
			taxAmount = Math.round(computedTax);
			netPay = Math.round(monthlyNet);
		}

		const payroll = await prisma.payroll.update({
			where: { id: BigInt(id) },
			data: {
				employeeId: employeeId ? BigInt(employeeId) : existingPayroll.employeeId,
				payPeriodStart: payPeriodStart ? new Date(payPeriodStart) : existingPayroll.payPeriodStart,
				payPeriodEnd: payPeriodEnd ? new Date(payPeriodEnd) : existingPayroll.payPeriodEnd,
				paymentType: employeePaymentType,
				salaryType: selectedSalaryType,
				taxPercentage: taxPercentageValue || null,
				pensionAmount: pensionAmount || null,
				insuranceAmount: insuranceAmount || null,
				regularHours: Number(regularHoursNumber.toFixed(2)),
				overtimeHours: Number(overtimeHoursNumber.toFixed(2)),
				regularPay: Math.round(regularPay),
				overtimePay: Math.round(overtimePay),
				allowances: Math.round(allowancesNumber),
				deductions: Math.round(deductionsNumber),
				bonuses: Math.round(bonusesNumber),
				grossPay: Math.round(grossPay),
				taxAmount: Math.round(taxAmount),
				netPay: Math.round(netPay),
				status: status ?? existingPayroll.status,
				paidAt: status === 'Paid' ? new Date() : existingPayroll.paidAt
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

		return json(serializeBigInt(payroll));
	} catch (error) {
		console.error('Error updating payroll:', error);
		return json({ error: 'Failed to update payroll' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'Payroll ID is required' }, { status: 400 });
		}

		const payroll = await prisma.payroll.findUnique({
			where: { id: BigInt(id) }
		});

		if (!payroll) {
			return json({ error: 'Payroll record not found' }, { status: 404 });
		}

		const deletedPayroll = await prisma.payroll.update({
			where: { id: BigInt(id) },
			data: {
				deletedAt: new Date(),
				status: 'Draft'
			}
		});

		return json(serializeBigInt(deletedPayroll));
	} catch (error) {
		console.error('Error deleting payroll:', error);
		return json({ error: 'Failed to delete payroll' }, { status: 500 });
	}
}
