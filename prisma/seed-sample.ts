import crypto from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import bcrypt from 'bcrypt';

type Db = any;

const id = () => crypto.randomUUID();
const money = (value: number) => BigInt(Math.round(value));
const date = (value: string) => new Date(`${value}T08:00:00.000Z`);

async function upsert(
	prisma: Db,
	model: string,
	where: Record<string, unknown>,
	data: Record<string, unknown>
) {
	const existing = await prisma[model].findFirst({ where });
	if (existing) return prisma[model].update({ where: { id: existing.id }, data });
	return prisma[model].create({ data: { publicId: id(), ...data } });
}

async function postEntry(
	prisma: Db,
	accounts: any[],
	entryNumber: string,
	entryDate: Date,
	description: string,
	lines: { code: string; debit?: number; credit?: number; projectId?: bigint | null; siteId?: bigint | null }[]
) {
	const existing = await prisma.journalEntry.findUnique({ where: { entryNumber } });
	if (existing) return existing;

	const debit = lines.reduce((sum, line) => sum + (line.debit ?? 0), 0);
	const credit = lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);
	if (debit !== credit) throw new Error(`Seed journal ${entryNumber} is unbalanced`);

	const accountMap = new Map(accounts.map((account) => [account.code, account.id]));

	return prisma.journalEntry.create({
		data: {
			publicId: id(),
			entryNumber,
			entryDate,
			description,
			sourceType: 'Seed',
			status: 'Posted',
			postedAt: new Date(),
			lines: {
				create: lines.map((line) => ({
					publicId: id(),
					accountId: accountMap.get(line.code),
					debit: money(line.debit ?? 0),
					credit: money(line.credit ?? 0),
					projectId: line.projectId ?? null,
					siteId: line.siteId ?? null
				}))
			}
		}
	});
}

/**
 * Malawi-localised demonstration data for Konzani Construction.
 * Idempotent: every record is matched on a stable business key.
 */
export async function seedSampleData(prisma: Db) {
	console.log('Seeding Malawi sample data...');

	const [admin, accounts, documentTypes] = await Promise.all([
		prisma.user.findUnique({ where: { email: 'admin@system.com' } }),
		prisma.account.findMany(),
		prisma.documentType.findMany()
	]);
	if (!admin) throw new Error('Admin user must exist before sample seeding');

	const company = await upsert(prisma, 'company', { publicId: 'company-konzani' }, {
		publicId: 'company-konzani',
		name: 'Konzani Construction Limited',
		registrationNumber: 'TRL/2024/012345',
		taxId: 'TIN 1234567890',
		address: 'Plot 47/1, Area 47, Lilongwe, Malawi',
		phone: '+265 999 123 456',
		email: 'info@konzani.mw',
		website: 'https://konzani.mw',
		status: 'active'
	});

	const branches = {};
	for (const [key, name, location] of [
		['lilongwe', 'Lilongwe Head Office', 'Area 47, Lilongwe'],
		['blantyre', 'Blantyre Branch', 'Limbe, Blantyre'],
		['mzuzu', 'Mzuzu Branch', 'Katoto, Mzuzu']
	] as const) {
		branches[key] = await upsert(
			prisma,
			'branch',
			{ publicId: `branch-${key}` },
			{ publicId: `branch-${key}`, name, location, description: 'Konzani operating branch' }
		);
	}

	const departments = {};
	for (const [key, name, type, branch] of [
		['civil', 'Civil Works', 'Operations', 'lilongwe'],
		['finance', 'Finance', 'Support', 'lilongwe'],
		['hr', 'Human Resources', 'Support', 'lilongwe'],
		['procurement', 'Procurement & Stores', 'Support', 'lilongwe']
	] as const) {
		departments[key] = await upsert(
			prisma,
			'department',
			{ publicId: `dept-${key}` },
			{ publicId: `dept-${key}`, branchId: branches[branch].id, name, type }
		);
	}

	const employees = {};
	const people = [
		['mgr', 'KCL-001', 'Chikondi', 'Banda', 'chikondi.banda@konzani.mw', 'Project Manager', 'civil', 'lilongwe', 2800000, '+265 991 234 567'],
		['qs', 'KCL-002', 'Thandiwe', 'Phiri', 'thandiwe.phiri@konzani.mw', 'Quantity Surveyor', 'civil', 'lilongwe', 2100000, '+265 992 345 678'],
		['eng', 'KCL-003', 'Mphatso', 'Mbewe', 'mphatso.mbewe@konzani.mw', 'Site Engineer', 'civil', 'lilongwe', 1650000, '+265 993 456 789'],
		['fore', 'KCL-004', 'Kondwani', 'Nyirenda', 'kondwani.nyirenda@konzani.mw', 'Foreman', 'civil', 'lilongwe', 950000, '+265 994 567 890'],
		['fin', 'KCL-005', 'Limbani', 'Gondwe', 'limbani.gondwe@konzani.mw', 'Finance Manager', 'finance', 'lilongwe', 2400000, '+265 995 678 901'],
		['hr', 'KCL-006', 'Tadala', 'Mwale', 'tadala.mwale@konzani.mw', 'Human Resources Officer', 'hr', 'lilongwe', 1200000, '+265 996 789 012'],
		['hse', 'KCL-007', 'Alinafe', 'Kachale', 'alinafe.kachale@konzani.mw', 'Safety Officer', 'civil', 'blantyre', 1100000, '+265 997 890 123'],
		['store', 'KCL-008', 'Yamikani', 'Chikafa', 'yamikani.chikafa@konzani.mw', 'Store Keeper', 'procurement', 'lilongwe', 800000, '+265 998 901 234']
	] as const;

	for (const [key, number, firstname, lastname, email, role, dept, branch, salary, phone] of people) {
		employees[key] = await upsert(
			prisma,
			'employee',
			{ employeeNumber: number },
			{
				employeeNumber: number,
				firstname,
				lastname,
				email,
				phone,
				departmentId: departments[dept].id,
				branchId: branches[branch].id,
				positionId: null,
				employmentType: 'Permanent',
				employmentStatus: 'Active',
				paymentType: 'Monthly',
				monthlySalary: money(salary),
				hireDate: date('2021-03-01'),
				gender: 'Not specified',
				nationality: 'Malawian',
				paymentMethod: 'Bank',
				paymentMethodName: 'National Bank of Malawi',
				accountName: `${firstname} ${lastname}`,
				accountNumber: '10025874',
				notes: role
			}
		);
	}

	const projects = {};
	const projectSpecs = [
		['hospital', 'PRJ/2026/0001', 'Ntcheu District Hospital', 'Ministry of Health', 'Ntcheu', 8500000000, 45, 'Building', 'mgr'],
		['m1', 'PRJ/2026/0002', 'M1 Road Rehabilitation (Kamuzu–Zalewa)', 'Roads Authority', 'Chikwawa', 12000000000, 30, 'Civil Works', 'eng'],
		['bwb', 'PRJ/2026/0003', 'Blantyre Water Supply Expansion', 'Blantyre Water Board', 'Blantyre', 4200000000, 60, 'Water & Sanitation', 'qs']
	] as const;

	for (const [key, number, name, client, location, value, progress, type, manager] of projectSpecs) {
		projects[key] = await upsert(prisma, 'project', { projectNumber: number }, {
			projectNumber: number,
			name,
			client,
			location,
			value: money(value),
			progress,
			status: 'Active',
			projectType: type,
			contractNumber: `CON/${number.split('/').pop()}/2026`,
			managerId: employees[manager].id,
			startDate: date('2026-01-15'),
			endDate: date('2027-06-30'),
			description: `${name} — construction contract for ${client} in ${location}.`
		});
	}

	const phaseSpecs = [
		['hospital', 'Site establishment', 100, 'Completed'],
		['hospital', 'Substructure', 100, 'Completed'],
		['hospital', 'Superstructure', 55, 'In Progress'],
		['hospital', 'Finishes', 0, 'Planned'],
		['m1', 'Mobilisation', 100, 'Completed'],
		['m1', 'Earthworks and subgrade', 60, 'In Progress'],
		['m1', 'Base course and surfacing', 10, 'In Progress'],
		['bwb', 'Pump station civil works', 80, 'In Progress'],
		['bwb', 'Reservoir construction', 70, 'In Progress'],
		['bwb', 'Pipe laying', 35, 'In Progress']
	] as const;

	let phaseIndex = 0;
	for (const [project, name, progress, status] of phaseSpecs) {
		phaseIndex += 1;
		await upsert(prisma, 'projectPhase', { publicId: `phase-seed-${phaseIndex}` }, {
			publicId: `phase-seed-${phaseIndex}`,
			projectId: projects[project].id,
			name,
			progress,
			status,
			sortOrder: phaseIndex,
			startDate: date('2026-02-01'),
			endDate: date('2027-03-31')
		});
	}

	const milestones = [
		['hospital', 'Foundation completed', '2026-04-30', 'Completed'],
		['hospital', 'Roof slab cast', '2026-11-30', 'Pending'],
		['m1', 'Subgrade approved by Roads Authority', '2026-10-31', 'Pending'],
		['bwb', 'Reservoir water-tightness test', '2026-12-15', 'Pending']
	] as const;

	let milestoneIndex = 0;
	for (const [project, name, due, status] of milestones) {
		milestoneIndex += 1;
		await upsert(prisma, 'projectMilestone', { publicId: `milestone-seed-${milestoneIndex}` }, {
			publicId: `milestone-seed-${milestoneIndex}`,
			projectId: projects[project].id,
			name,
			dueDate: date(due),
			status,
			completedAt: status === 'Completed' ? date('2026-04-28') : null,
			sortOrder: milestoneIndex
		});
	}

	const sites = {};
	for (const [key, number, name, client, owner, progress] of [
		['hospital', 'SITE/2026/0001', 'Ntcheu Hospital Site', 'Ministry of Health', 'hospital', 45],
		['m1', 'SITE/2026/0002', 'M1 Section 2 — Zalewa', 'Roads Authority', 'm1', 30],
		['bwb', 'SITE/2026/0003', 'BWB Reservoir Site', 'Blantyre Water Board', 'bwb', 60]
	] as const) {
		sites[key] = await upsert(prisma, 'site', { siteNumber: number }, {
			siteNumber: number,
			name,
			client,
			location: owner === 'm1' ? 'Chikwawa' : owner === 'bwb' ? 'Blantyre' : 'Ntcheu',
			status: 'Active',
			progress,
			projectId: projects[owner].id,
			siteManagerId: employees[owner === 'm1' ? 'eng' : 'mgr'].id,
			projectType: key === 'm1' ? 'Roads' : 'Building',
			startDate: date('2026-02-01'),
			endDate: date('2027-05-31'),
			description: `${name} execution site.`
		});
	}

	const suppliers = {};
	for (const [key, name, category, town, phone] of [
		['cement', 'Malawi Portland Cement Ltd', 'Cement', 'Blantyre', '+265 111 870 000'],
		['steel', 'Apex Steel & Hardware', 'Steel', 'Lilongwe', '+265 999 555 111'],
		['plant', 'Kanengo Plant Hire', 'Plant hire', 'Lilongwe', '+265 888 444 222'],
		['fuel', 'Petroda Malawi', 'Fuel', 'Lilongwe', '+265 177 333 000']
	] as const) {
		suppliers[key] = await upsert(prisma, 'supplier', { publicId: `supplier-${key}` }, {
			publicId: `supplier-${key}`,
			name,
			category,
			phone,
			address: `${town}, Malawi`,
			status: 'Active'
		});
	}

	const items = {};
	for (const [key, code, name, unit, cost, reorder] of [
		['cement', 'MAT-CEM-50', 'Cement 50kg', 'bags', 18500, 200],
		['rebar', 'MAT-RBR-12', 'Rebar Y12', 'tonnes', 1850000, 5],
		['sand', 'MAT-SAND', 'River sand', 'tonnes', 45000, 50],
		['stone', 'MAT-QST', 'Quarry stone 19mm', 'tonnes', 38000, 40],
		['bricks', 'MAT-BRK', 'Burnt bricks', 'pieces', 120, 5000],
		['diesel', 'MAT-DSL', 'Diesel', 'litres', 3200, 500]
	] as const) {
		items[key] = await upsert(prisma, 'inventoryItem', { code }, {
			code,
			name,
			category: 'Construction material',
			unit,
			unitCost: money(cost),
			reorderLevel: reorder,
			status: 'Active'
		});
	}

	const warehouse = await prisma.warehouse.findFirst({ where: { publicId: 'warehouse-main' } });
	if (warehouse) {
		let stockIndex = 0;
		for (const [key, qty] of [['cement', 1200], ['rebar', 25], ['sand', 180], ['stone', 160], ['bricks', 24000], ['diesel', 3000]] as const) {
			stockIndex += 1;
			await upsert(prisma, 'stockMovement', { publicId: `stock-seed-in-${stockIndex}` }, {
				publicId: `stock-seed-in-${stockIndex}`,
				itemId: items[key].id,
				warehouseId: warehouse.id,
				type: 'In',
				quantity: qty,
				unitCost: items[key].unitCost,
				movementDate: date('2026-09-01'),
				referenceType: 'Opening',
				notes: 'Opening stock (seed)'
			});
		}
	}

	const equipment = {};
	for (const [key, code, name, category, rate, project] of [
		['excavator', 'EQ-001', 'CAT 320D Excavator', 'Earthworks', 85000, 'hospital'],
		['grader', 'EQ-002', 'Komatsu GD655 Grader', 'Roads', 450000, 'm1'],
		['tipper', 'EQ-003', 'Howo 10m³ Tipper', 'Transport', 180000, 'hospital'],
		['generator', 'EQ-004', '100kVA Generator', 'Support', 75000, 'bwb']
	] as const) {
		equipment[key] = await upsert(prisma, 'equipment', { code }, {
			code,
			name,
			category,
			ownership: 'Owned',
			status: 'Active',
			hourlyRate: money(rate),
			dailyRate: money(rate * 8),
			projectId: projects[project].id,
			acquiredAt: date('2023-06-15'),
			purchaseValue: money(rate * 1200)
		});
	}

	let logIndex = 0;
	for (const [equipmentKey, type, qty, cost, project, when] of [
		['excavator', 'Fuel', 120, 384000, 'hospital', '2026-10-10'],
		['grader', 'Maintenance', 1, 1250000, 'm1', '2026-10-12']
	] as const) {
		logIndex += 1;
		await upsert(prisma, 'equipmentLog', { publicId: `equipment-log-seed-${logIndex}` }, {
			publicId: `equipment-log-seed-${logIndex}`,
			equipmentId: equipment[equipmentKey].id,
			logDate: date(when),
			type,
			quantity: qty,
			unitCost: type === 'Fuel' ? money(3200) : money(cost),
			cost: money(cost),
			projectId: projects[project].id,
			notes: type === 'Fuel' ? 'Diesel drawn from Petroda' : 'Hydraulic service'
		});
	}

	// Timesheets drive the HR → project labour allocation.
	const timesheetPeople: [string, string, string][] = [
		['eng', 'hospital', '2026-10-05'],
		['fore', 'hospital', '2026-10-05'],
		['mgr', 'm1', '2026-10-06'],
		['qs', 'bwb', '2026-10-07']
	];
	let timesheetIndex = 0;
	for (const [employeeKey, project, day] of timesheetPeople) {
		timesheetIndex += 1;
		await upsert(prisma, 'timesheet', { publicId: `timesheet-seed-${timesheetIndex}` }, {
			publicId: `timesheet-seed-${timesheetIndex}`,
			employeeId: employees[employeeKey].id,
			projectId: projects[project].id,
			siteId: sites[project].id,
			date: date(day),
			startTime: new Date(`${day}T07:00:00+02:00`),
			endTime: new Date(`${day}T17:00:00+02:00`),
			breakMinutes: 60,
			regularHours: 8,
			overtimeHours: 1,
			attendanceStatus: 'Present',
			status: 'Approved',
			approvedBy: admin.id,
			approvedAt: date(day),
			description: 'Normal site shift'
		});
	}

	// Payroll (approved) and the matching ledger postings.
	const payrollKeys = ['mgr', 'qs', 'eng', 'fore', 'fin'];
	const payrolls = {};
	let payrollIndex = 0;
	for (const employeeKey of payrollKeys) {
		payrollIndex += 1;
		const salary = Number(employees[employeeKey].monthlySalary);
		const tax = Math.round(salary * 0.1);
		const pension = Math.round(salary * 0.05);
		const net = salary - tax - pension;
		payrolls[employeeKey] = await upsert(prisma, 'payroll', { publicId: `payroll-seed-${payrollIndex}` }, {
			publicId: `payroll-seed-${payrollIndex}`,
			employeeId: employees[employeeKey].id,
			payPeriodStart: date('2026-10-01'),
			payPeriodEnd: date('2026-10-31'),
			paymentType: 'Monthly',
			salaryType: 'Gross',
			taxPercentage: 10,
			pensionAmount: money(pension),
			insuranceAmount: 0,
			regularHours: 176,
			overtimeHours: 0,
			regularPay: money(salary),
			overtimePay: 0,
			allowances: 0,
			deductions: 0,
			bonuses: 0,
			grossPay: money(salary),
			taxAmount: money(tax),
			netPay: money(net),
			status: 'Approved',
			notes: 'October 2026 payroll (seed)'
		});
	}

	const invoices = {};
	for (const [key, number, client, project, amount, paid, status, when] of [
		['ipc2', 'INV/2026/0001', 'Ministry of Health', 'hospital', 850000000, 0, 'Sent', '2026-09-30'],
		['m1ipc1', 'INV/2026/0002', 'Roads Authority', 'm1', 1200000000, 400000000, 'PartPaid', '2026-09-15'],
		['variation', 'INV/2026/0003', 'Ministry of Health', 'hospital', 95000000, 0, 'Pending Approval', '2026-10-18']
	] as const) {
		invoices[key] = await upsert(prisma, 'invoice', { invoiceNumber: number }, {
			invoiceNumber: number,
			client,
			projectId: projects[project].id,
			issueDate: date(when),
			dueDate: date('2026-11-30'),
			subtotal: money(amount),
			taxAmount: 0,
			total: money(amount),
			paidAmount: money(paid),
			status,
			description: `${client} progress certificate`
		});
		invoices[key].projectId = projects[project].id;
	}

	const bills = {};
	for (const [key, number, supplier, project, amount, paid, status, when] of [
		['cement', 'BILL/2026/0001', 'cement', 'hospital', 120000000, 50000000, 'PartPaid', '2026-09-25'],
		['plant', 'BILL/2026/0002', 'plant', 'm1', 45000000, 0, 'Pending Approval', '2026-10-16']
	] as const) {
		bills[key] = await upsert(prisma, 'bill', { billNumber: number }, {
			billNumber: number,
			supplierId: suppliers[supplier].id,
			supplierName: suppliers[supplier].name,
			projectId: projects[project].id,
			billDate: date(when),
			dueDate: date('2026-11-15'),
			subtotal: money(amount),
			taxAmount: 0,
			total: money(amount),
			paidAmount: money(paid),
			status,
			description: `${suppliers[supplier].name} supply`
		});
		bills[key].projectId = projects[project].id;
	}

	await upsert(prisma, 'payment', { paymentNumber: 'PAY/2026/0001' }, {
		paymentNumber: 'PAY/2026/0001',
		type: 'Receipt',
		invoiceId: invoices.m1ipc1.id,
		paymentDate: date('2026-10-05'),
		amount: money(400000000),
		method: 'Bank Transfer',
		reference: 'NBM-RA-88421'
	});
	await upsert(prisma, 'payment', { paymentNumber: 'PAY/2026/0002' }, {
		paymentNumber: 'PAY/2026/0002',
		type: 'Payment',
		billId: bills.cement.id,
		paymentDate: date('2026-10-08'),
		amount: money(50000000),
		method: 'Bank Transfer',
		reference: 'NBM-MPC-77120'
	});

	const projectsById = [projects.hospital, projects.m1, projects.bwb];
	const ledger = [		['JE/SEED/0001', '2026-09-30', 'Invoice INV/2026/0001 — Ministry of Health', [
			{ code: '1100', debit: 850000000, projectId: projects.hospital.id },
			{ code: '4000', credit: 850000000, projectId: projects.hospital.id }
		]],
		['JE/SEED/0002', '2026-09-15', 'Invoice INV/2026/0002 — Roads Authority', [
			{ code: '1100', debit: 1200000000, projectId: projects.m1.id },
			{ code: '4000', credit: 1200000000, projectId: projects.m1.id }
		]],
		['JE/SEED/0003', '2026-10-05', 'Receipt PAY/2026/0001 — Roads Authority', [
			{ code: '1000', debit: 400000000 },
			{ code: '1100', credit: 400000000 }
		]],
		['JE/SEED/0004', '2026-09-25', 'Bill BILL/2026/0001 — Malawi Portland Cement', [
			{ code: '5100', debit: 120000000, projectId: projects.hospital.id },
			{ code: '2000', credit: 120000000 }
		]],
		['JE/SEED/0005', '2026-10-08', 'Payment PAY/2026/0002 — Malawi Portland Cement', [
			{ code: '2000', debit: 50000000 },
			{ code: '1000', credit: 50000000 }
		]],
		['JE/SEED/0006', '2026-10-31', 'October payroll — direct labour', [
			{ code: '5000', debit: 31500000, projectId: projects.hospital.id },
			{ code: '5400', debit: 17500000, projectId: projects.m1.id },
			{ code: '2100', credit: 44100000 },
			{ code: '2200', credit: 4900000 }
		]],
		['JE/SEED/0007', '2026-10-10', 'Equipment fuel — CAT 320D', [
			{ code: '5200', debit: 384000, projectId: projects.hospital.id },
			{ code: '1000', credit: 384000 }
		]],
		['JE/SEED/0008', '2026-10-12', 'Material issue — cement', [
			{ code: '5100', debit: 3700000, projectId: projects.hospital.id },
			{ code: '1200', credit: 3700000 }
		]]
	] as const;
	for (const [entryNumber, when, description, lines] of ledger) {
		await postEntry(prisma, accounts, entryNumber, date(when), description, lines as any);
	}

	// Supporting documents (real files) linked to finance and projects.
	const uploadDir = join(process.cwd(), 'uploads', 'documents');
	await mkdir(uploadDir, { recursive: true });
	const documents = {};
	for (const [key, title, fileName, projectKey, body] of [
		['ipc', 'Ntcheu Hospital IPC No.2 valuation', 'ntcheu-ipc-02.txt', 'hospital', 'Interim Payment Certificate No.2 for Ntcheu District Hospital.'],
		['cement', 'Malawi Portland Cement invoice 2026-09', 'cement-invoice-sep-2026.txt', 'hospital', 'Supplier invoice for 6,486 bags of cement supplied to Ntcheu.'],
		['contract', 'Ntcheu District Hospital contract', 'ntcheu-contract.txt', 'hospital', 'Signed contract between Konzani Construction and the Ministry of Health.']
	] as const) {
		const storedName = `seed-${key}.txt`;
		await writeFile(join(uploadDir, storedName), body, 'utf8');
		documents[key] = await upsert(prisma, 'document', { publicId: `document-seed-${key}` }, {
			publicId: `document-seed-${key}`,
			title,
			description: body,
			fileName,
			storedName,
			fileExtension: 'txt',
			mimeType: 'text/plain',
			fileSize: money(Buffer.byteLength(body)),
			checksum: crypto.createHash('sha256').update(body).digest('hex'),
			version: 1,
			status: 'Approved',
			confidentiality: 'Internal',
			ownerId: admin.id,
			projectId: projects[projectKey].id,
			documentTypeId:
				documentTypes.find((type) => type.name === (key === 'contract' ? 'Contract' : 'Invoice'))?.id ?? null,
			storagePath: `/uploads/documents/${storedName}`
		});
	}

	await prisma.invoice.update({
		where: { id: invoices.ipc2.id },
		data: { documentId: documents.ipc.id }
	});
	await prisma.bill.update({
		where: { id: bills.cement.id },
		data: { documentId: documents.cement.id }
	});

	// Attach evidence/approval documents across the operational records.
	if (documents.contract) {
		const evidenceDocumentId = documents.contract.id;
		await prisma.payment.updateMany({
			where: { paymentNumber: { startsWith: 'PAY/2026/' } },
			data: { documentId: evidenceDocumentId }
		});
		await prisma.equipmentLog.updateMany({
			where: { publicId: { startsWith: 'equipment-log-seed' } },
			data: { documentId: evidenceDocumentId }
		});
		await prisma.inspection.updateMany({
			where: { inspectionNumber: { startsWith: 'INS/2026/' } },
			data: { documentId: evidenceDocumentId }
		});
		await prisma.ncr.updateMany({
			where: { ncrNumber: { startsWith: 'NCR/2026/' } },
			data: { documentId: evidenceDocumentId }
		});
		await prisma.safetyIncident.updateMany({
			where: { incidentNumber: { startsWith: 'INC/2026/' } },
			data: { documentId: evidenceDocumentId }
		});
		await prisma.rfi.updateMany({
			where: { rfiNumber: { startsWith: 'RFI/2026/' } },
			data: { documentId: evidenceDocumentId }
		});
		await prisma.purchaseOrder.updateMany({
			where: { poNumber: 'PO/2026/0001' },
			data: { grnDocumentId: evidenceDocumentId }
		});
	}

	// Approvals: two pending items, plus history for the approved ones.
	const approvals = [
		['Invoice', invoices.variation.id, 'Pending', null],
		['Bill', bills.plant.id, 'Pending', null],
		['Invoice', invoices.ipc2.id, 'Approved', admin.id],
		['Bill', bills.cement.id, 'Approved', admin.id]
	] as const;
	let approvalIndex = 0;
	for (const [entityType, entityId, status, decidedBy] of approvals) {
		approvalIndex += 1;
		await upsert(prisma, 'approval', { publicId: `approval-seed-${approvalIndex}` }, {
			publicId: `approval-seed-${approvalIndex}`,
			entityType,
			entityId,
			status,
			requestedBy: admin.id,
			decidedBy,
			decidedAt: status === 'Approved' ? date('2026-10-10') : null,
			decisionNotes: status === 'Approved' ? 'Approved by management' : null
		});
	}

	const quality = [
		['inspection', 'INS/2026/0001', 'hospital', 'Concrete', '2026-10-08', 'Pass', 'Slump and cube tests passed.'],
		['inspection', 'INS/2026/0002', 'm1', 'Site', '2026-10-12', 'Fail', 'Subgrade compaction below specification.'],
		['ncr', 'NCR/2026/0001', 'hospital', 'Honeycombing on column C3', 'High', 'Open'],
		['ncr', 'NCR/2026/0002', 'm1', 'Compaction test failure at chainage 12+400', 'Critical', 'Under Review']
	] as const;
	let qualityIndex = 0;
	for (const row of quality) {
		qualityIndex += 1;
		if (row[0] === 'inspection') {
			const [, number, project, type, when, status, findings] = row;
			await upsert(prisma, 'inspection', { inspectionNumber: number }, {
				inspectionNumber: number,
				projectId: projects[project].id,
				siteId: sites[project].id,
				type,
				inspectionDate: date(when),
				inspectorName: 'Alinafe Kachale',
				status,
				findings
			});
		} else {
			const [, number, project, title, severity, status] = row;
			await upsert(prisma, 'ncr', { ncrNumber: number }, {
				ncrNumber: number,
				projectId: projects[project].id,
				siteId: sites[project].id,
				title,
				severity,
				status,
				raisedDate: date('2026-10-12'),
				dueDate: date('2026-11-10'),
				description: title
			});
		}
	}

	const hse = [
		['INC/2026/0001', 'hospital', 'Near Miss', 'Low', 'Falling scaffold board near access route', 0, 'Closed'],
		['INC/2026/0002', 'm1', 'Injury', 'Medium', 'Worker sustained hand injury during rebar fixing', 3, 'Investigating']
	] as const;
	for (const [number, project, type, severity, description, lostDays, status] of hse) {
		await upsert(prisma, 'safetyIncident', { incidentNumber: number }, {
			incidentNumber: number,
			projectId: projects[project].id,
			siteId: sites[project].id,
			incidentDate: date('2026-10-09'),
			type,
			severity,
			description,
			lostDays,
			status,
			reportedBy: 'Alinafe Kachale',
			correctiveAction: 'Toolbox talk held and corrective action agreed.'
		});
	}

	const rfis = [
		['RFI/2026/0001', 'hospital', 'Beam reinforcement lap length', 'Confirm lap length at grid C3', 'Answered', 'Use 40db lap length per structural detail.'],
		['RFI/2026/0002', 'm1', 'Subgrade material approval', 'Confirm approved borrow pit for subgrade', 'Open', null]
	] as const;
	for (const [number, project, subject, question, status, response] of rfis) {
		await upsert(prisma, 'rfi', { rfiNumber: number }, {
			rfiNumber: number,
			projectId: projects[project].id,
			siteId: sites[project].id,
			subject,
			question,
			response,
			status,
			raisedBy: 'Mphatso Mbewe',
			assignedTo: 'Consulting Engineer',
			raisedDate: date('2026-10-06'),
			dueDate: date('2026-10-20'),
			answeredDate: response ? date('2026-10-09') : null
		});
	}

	const orders = [
		['PO/2026/0001', 'cement', 'hospital', 100, 18500, 'Ordered', '2026-10-01'],
		['PO/2026/0002', 'steel', 'm1', 8, 1850000, 'Draft', '2026-10-14']
	] as const;
	for (const [number, supplier, project, qty, price, status, when] of orders) {
		const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber: number } });
		if (!existing) {
			await prisma.purchaseOrder.create({
				data: {
					publicId: id(),
					poNumber: number,
					supplierId: suppliers[supplier].id,
					projectId: projects[project].id,
					orderDate: date(when),
					status,
					subtotal: money(qty * price),
					total: money(qty * price),
					items: {
						create: [
							{
								publicId: id(),
								description: supplier === 'cement' ? 'Cement 50kg' : 'Rebar Y12',
								unit: supplier === 'cement' ? 'bags' : 'tonnes',
								quantity: qty,
								unitPrice: money(price),
								amount: money(qty * price)
							}
						]
					}
				}
			});
		}
	}

	// Procurement tracking history for the demonstration orders.
	const seededOrders = await prisma.purchaseOrder.findMany({
		where: { poNumber: { in: ['PO/2026/0001', 'PO/2026/0002'] } }
	});
	const cementOrder = seededOrders.find((order) => order.poNumber === 'PO/2026/0001');
	const steelOrder = seededOrders.find((order) => order.poNumber === 'PO/2026/0002');

	if (documents?.contract && cementOrder) {
		await prisma.purchaseOrder.update({
			where: { id: cementOrder.id },
			data: { documentId: documents.contract.id }
		});
	}

	const activitySpecs = [
		...(cementOrder
			? [
					[`activity-seed-po1-created`, cementOrder.id, 'created', 'Purchase order PO/2026/0001 created', '2026-10-01T08:00:00Z'],
					[`activity-seed-po1-submitted`, cementOrder.id, 'submitted', 'Submitted for approval', '2026-10-01T09:00:00Z'],
					[`activity-seed-po1-approved`, cementOrder.id, 'approved', 'Approved by management', '2026-10-01T11:30:00Z'],
					[`activity-seed-po1-doc`, cementOrder.id, 'document_attached', 'Supporting document attached: Ntcheu District Hospital contract', '2026-10-01T11:35:00Z']
				]
			: []),
		...(steelOrder
			? [[`activity-seed-po2-created`, steelOrder.id, 'created', 'Purchase order PO/2026/0002 created', '2026-10-14T08:00:00Z']]
			: [])
	] as const;
	for (const [publicId, entityId, action, description, when] of activitySpecs) {
		await upsert(prisma, 'recordActivity', { publicId }, {
			publicId,
			entityType: 'PurchaseOrder',
			entityId,
			action,
			description,
			userId: admin.id,
			createdAt: new Date(when)
		});
	}

	// Users for the new operational roles (password: Password123!).
	const passwordHash = await bcrypt.hash('Password123!', 12);
	const users = [
		['finance@konzani.mw', 'Limbani', 'Gondwe', 'role-finance'],
		['procurement@konzani.mw', 'Yamikani', 'Chikafa', 'role-procurement'],
		['hr@konzani.mw', 'Tadala', 'Mwale', 'role-hr']
	] as const;
	for (const [email, firstname, lastname, rolePublicId] of users) {
		const role = await prisma.role.findUnique({ where: { publicId: rolePublicId } });
		if (!role) continue;
		await upsert(prisma, 'user', { email }, {
			email,
			firstname,
			lastname,
			password: passwordHash,
			roleId: role.id,
			departmentId: null,
			branchId: branches.lilongwe.id,
			status: 'active'
		});
	}

	console.log('Malawi sample data seeded.');
	console.log('Sample logins: finance@konzani.mw / procurement@konzani.mw / hr@konzani.mw — Password123!');
}
