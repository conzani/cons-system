import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
	console.log('Starting seed...');

	// Create permissions based on modules
	const permissions = [
		// Dashboard
		{ name: 'view_dashboard', action: 'view', module: 'Dashboard' },
		{ name: 'view_tasks', action: 'view', module: 'Dashboard' },
		{ name: 'view_notifications', action: 'view', module: 'Dashboard' },
		
		// Tender & Bid Management
		{ name: 'view_tenders', action: 'view', module: 'Tenders' },
		{ name: 'create_tenders', action: 'create', module: 'Tenders' },
		{ name: 'edit_tenders', action: 'edit', module: 'Tenders' },
		{ name: 'delete_tenders', action: 'delete', module: 'Tenders' },
		{ name: 'view_bid_calendar', action: 'view', module: 'Tenders' },
		{ name: 'manage_bid_teams', action: 'manage', module: 'Tenders' },
		{ name: 'prepare_boq', action: 'create', module: 'Tenders' },
		{ name: 'estimate_costs', action: 'view', module: 'Tenders' },
		{ name: 'submit_bids', action: 'create', module: 'Tenders' },
		{ name: 'approve_bids', action: 'approve', module: 'Tenders' },
		
		// Project Management
		{ name: 'view_projects', action: 'view', module: 'Projects' },
		{ name: 'create_projects', action: 'create', module: 'Projects' },
		{ name: 'edit_projects', action: 'edit', module: 'Projects' },
		{ name: 'delete_projects', action: 'delete', module: 'Projects' },
		{ name: 'manage_phases', action: 'manage', module: 'Projects' },
		{ name: 'manage_wbs', action: 'manage', module: 'Projects' },
		{ name: 'manage_milestones', action: 'manage', module: 'Projects' },
		{ name: 'manage_schedule', action: 'manage', module: 'Projects' },
		{ name: 'manage_resources', action: 'manage', module: 'Projects' },
		{ name: 'manage_budget', action: 'manage', module: 'Projects' },
		{ name: 'track_progress', action: 'view', module: 'Projects' },
		
		// Site Management
		{ name: 'view_sites', action: 'view', module: 'Sites' },
		{ name: 'create_sites', action: 'create', module: 'Sites' },
		{ name: 'edit_sites', action: 'edit', module: 'Sites' },
		{ name: 'delete_sites', action: 'delete', module: 'Sites' },
		{ name: 'manage_site_personnel', action: 'manage', module: 'Sites' },
		{ name: 'view_daily_reports', action: 'view', module: 'Sites' },
		{ name: 'create_daily_reports', action: 'create', module: 'Sites' },
		{ name: 'manage_attendance', action: 'manage', module: 'Sites' },
		{ name: 'manage_visitors', action: 'manage', module: 'Sites' },
		
		// Engineering
		{ name: 'view_drawings', action: 'view', module: 'Engineering' },
		{ name: 'create_drawings', action: 'create', module: 'Engineering' },
		{ name: 'edit_drawings', action: 'edit', module: 'Engineering' },
		{ name: 'manage_revisions', action: 'manage', module: 'Engineering' },
		{ name: 'manage_submittals', action: 'manage', module: 'Engineering' },
		{ name: 'manage_rfis', action: 'manage', module: 'Engineering' },
		{ name: 'manage_method_statements', action: 'manage', module: 'Engineering' },
		
		// Procurement
		{ name: 'view_procurement', action: 'view', module: 'Procurement' },
		{ name: 'create_purchase_requests', action: 'create', module: 'Procurement' },
		{ name: 'manage_rfqs', action: 'manage', module: 'Procurement' },
		{ name: 'manage_orders', action: 'manage', module: 'Procurement' },
		{ name: 'manage_suppliers', action: 'manage', module: 'Procurement' },
		{ name: 'manage_contracts', action: 'manage', module: 'Procurement' },
		
		// Inventory
		{ name: 'view_inventory', action: 'view', module: 'Inventory' },
		{ name: 'manage_warehouses', action: 'manage', module: 'Inventory' },
		{ name: 'manage_materials', action: 'manage', module: 'Inventory' },
		{ name: 'manage_stock', action: 'manage', module: 'Inventory' },
		{ name: 'manage_transfers', action: 'manage', module: 'Inventory' },
		
		// Equipment & Fleet
		{ name: 'view_equipment', action: 'view', module: 'Equipment' },
		{ name: 'manage_equipment', action: 'manage', module: 'Equipment' },
		{ name: 'manage_vehicles', action: 'manage', module: 'Equipment' },
		{ name: 'manage_maintenance', action: 'manage', module: 'Equipment' },
		{ name: 'manage_fuel', action: 'manage', module: 'Equipment' },
		
		// Human Resources
		{ name: 'view_employees', action: 'view', module: 'HR' },
		{ name: 'manage_employees', action: 'manage', module: 'HR' },
		{ name: 'manage_departments', action: 'manage', module: 'HR' },
		{ name: 'manage_recruitment', action: 'manage', module: 'HR' },
		{ name: 'manage_attendance', action: 'manage', module: 'HR' },
		{ name: 'manage_leave', action: 'manage', module: 'HR' },
		{ name: 'manage_payroll', action: 'manage', module: 'HR' },
		
		// Finance
		{ name: 'view_finance', action: 'view', module: 'Finance' },
		{ name: 'manage_accounts_receivable', action: 'manage', module: 'Finance' },
		{ name: 'manage_accounts_payable', action: 'manage', module: 'Finance' },
		{ name: 'manage_ledger', action: 'manage', module: 'Finance' },
		{ name: 'manage_invoices', action: 'manage', module: 'Finance' },
		{ name: 'manage_budgets', action: 'manage', module: 'Finance' },
		{ name: 'view_reports', action: 'view', module: 'Finance' },
		
		// Quality Management
		{ name: 'view_quality', action: 'view', module: 'Quality' },
		{ name: 'manage_inspections', action: 'manage', module: 'Quality' },
		{ name: 'manage_ncr', action: 'manage', module: 'Quality' },
		{ name: 'manage_audits', action: 'manage', module: 'Quality' },
		
		// HSE
		{ name: 'view_hse', action: 'view', module: 'HSE' },
		{ name: 'manage_incidents', action: 'manage', module: 'HSE' },
		{ name: 'manage_risk_assessments', action: 'manage', module: 'HSE' },
		{ name: 'manage_permits', action: 'manage', module: 'HSE' },
		
		// Document Management
		{ name: 'view_documents', action: 'view', module: 'Documents' },
		{ name: 'upload_documents', action: 'create', module: 'Documents' },
		{ name: 'manage_documents', action: 'manage', module: 'Documents' },
		
		// Reports & Analytics
		{ name: 'view_reports', action: 'view', module: 'Reports' },
		{ name: 'create_reports', action: 'create', module: 'Reports' },
		{ name: 'export_reports', action: 'export', module: 'Reports' },
		
		// Administration
		{ name: 'view_admin', action: 'view', module: 'Administration' },
		{ name: 'manage_branches', action: 'manage', module: 'Administration' },
		{ name: 'manage_departments', action: 'manage', module: 'Administration' },
		{ name: 'manage_settings', action: 'manage', module: 'Administration' },
		
		// Security & Access
		{ name: 'view_users', action: 'view', module: 'Security' },
		{ name: 'manage_users', action: 'manage', module: 'Security' },
		{ name: 'manage_roles', action: 'manage', module: 'Security' },
		{ name: 'manage_permissions', action: 'manage', module: 'Security' },
		{ name: 'view_audit_logs', action: 'view', module: 'Security' }
	];

	console.log('Creating permissions...');
	const createdPermissions = await Promise.all(
		permissions.map(p => 
			prisma.permission.upsert({
				where: { name: p.name },
				update: {},
				create: {
					publicId: generatePublicId(),
					name: p.name,
					action: p.action,
					module: p.module
				}
			})
		)
	);

	// Create roles
	console.log('Creating roles...');
	const adminRole = await prisma.role.upsert({
		where: { publicId: 'role-admin' },
		update: {},
		create: {
			publicId: generatePublicId(),
			name: 'Administrator'
		}
	});

	const managerRole = await prisma.role.upsert({
		where: { publicId: 'role-manager' },
		update: {},
		create: {
			publicId: generatePublicId(),
			name: 'Manager'
		}
	});

	const engineerRole = await prisma.role.upsert({
		where: { publicId: 'role-engineer' },
		update: {},
		create: {
			publicId: generatePublicId(),
			name: 'Engineer'
		}
	});

	const supervisorRole = await prisma.role.upsert({
		where: { publicId: 'role-supervisor' },
		update: {},
		create: {
			publicId: generatePublicId(),
			name: 'Supervisor'
		}
	});

	const userRole = await prisma.role.upsert({
		where: { publicId: 'role-user' },
		update: {},
		create: {
			publicId: generatePublicId(),
			name: 'User'
		}
	});

	// Assign all permissions to admin
	console.log('Assigning permissions to roles...');
	await prisma.rolesPermission.deleteMany({ where: { rolesId: adminRole.id } });
	await prisma.rolesPermission.createMany({
		data: createdPermissions.map(p => ({
			rolesId: adminRole.id,
			permissionId: p.id
		})),
		skipDuplicates: true
	});

	// Assign manager permissions
	const managerPermissions = createdPermissions.filter(p => 
		!p.name.includes('delete') && 
		!p.name.includes('manage_users') && 
		!p.name.includes('manage_roles') &&
		!p.name.includes('manage_permissions')
	);
	await prisma.rolesPermission.deleteMany({ where: { rolesId: managerRole.id } });
	await prisma.rolesPermission.createMany({
		data: managerPermissions.map(p => ({
			rolesId: managerRole.id,
			permissionId: p.id
		})),
		skipDuplicates: true
	});

	// Assign engineer permissions
	const engineerPermissions = createdPermissions.filter(p => 
		p.module === 'Engineering' || 
		p.module === 'Sites' ||
		p.name === 'view_projects' ||
		p.name === 'view_dashboard'
	);
	await prisma.rolesPermission.deleteMany({ where: { rolesId: engineerRole.id } });
	await prisma.rolesPermission.createMany({
		data: engineerPermissions.map(p => ({
			rolesId: engineerRole.id,
			permissionId: p.id
		})),
		skipDuplicates: true
	});

	// Assign supervisor permissions
	const supervisorPermissions = createdPermissions.filter(p => 
		p.module === 'Sites' ||
		p.name === 'view_dashboard'
	);
	await prisma.rolesPermission.deleteMany({ where: { rolesId: supervisorRole.id } });
	await prisma.rolesPermission.createMany({
		data: supervisorPermissions.map(p => ({
			rolesId: supervisorRole.id,
			permissionId: p.id
		})),
		skipDuplicates: true
	});

	// Assign basic user permissions
	const userPermissions = createdPermissions.filter(p => 
		p.name === 'view_dashboard' ||
		p.name === 'view_tasks' ||
		p.name === 'view_notifications'
	);
	await prisma.rolesPermission.deleteMany({ where: { rolesId: userRole.id } });
	await prisma.rolesPermission.createMany({
		data: userPermissions.map(p => ({
			rolesId: userRole.id,
			permissionId: p.id
		})),
		skipDuplicates: true
	});

	// Create default branch
	console.log('Creating default branch...');
	const branch = await prisma.branch.upsert({
		where: { publicId: 'branch-main' },
		update: {},
		create: {
			publicId: generatePublicId(),
			name: 'Main Branch',
			description: 'Headquarters',
			location: 'Main Office'
		}
	});

	// Create default department
	console.log('Creating default department...');
	const department = await prisma.department.upsert({
		where: { publicId: 'dept-admin' },
		update: {},
		create: {
			publicId: generatePublicId(),
			branchId: branch.id,
			name: 'Administration',
			type: 'Administrative'
		}
	});

	// Create default admin user
	console.log('Creating default admin user...');
	const hashedPassword = await hashPassword('admin123');
	const adminUser = await prisma.user.upsert({
		where: { email: 'admin@system.com' },
		update: {},
		create: {
			publicId: generatePublicId(),
			roleId: adminRole.id,
			departmentId: department.id,
			branchId: branch.id,
			firstname: 'System',
			lastname: 'Administrator',
			email: 'admin@system.com',
			password: hashedPassword,
			status: 'active'
		}
	});

	// Create document types
	console.log('Creating document types...');
	const documentTypes = [
		{ name: 'Tender', description: 'Tender and bid documents' },
		{ name: 'BOQ', description: 'Bill of Quantities' },
		{ name: 'Drawing', description: 'Engineering drawings' },
		{ name: 'Shop Drawing', description: 'Shop and fabrication drawings' },
		{ name: 'Contract', description: 'Contract documents' },
		{ name: 'Invoice', description: 'Financial invoices' },
		{ name: 'Purchase Order', description: 'Purchase orders' },
		{ name: 'Material Specification', description: 'Material specifications' },
		{ name: 'Safety Report', description: 'Safety and HSE reports' },
		{ name: 'Inspection Report', description: 'Quality inspection reports' },
		{ name: 'Employee Document', description: 'HR employee documents' },
		{ name: 'Vehicle Registration', description: 'Vehicle registration documents' },
		{ name: 'Insurance Certificate', description: 'Insurance certificates' },
		{ name: 'Timesheet', description: 'Employee timesheets' },
		{ name: 'RFI', description: 'Request for Information' },
		{ name: 'Method Statement', description: 'Work method statements' },
		{ name: 'Technical Submittal', description: 'Technical submittals' },
		{ name: 'As-Built Drawing', description: 'As-built drawings' },
		{ name: 'Daily Report', description: 'Site daily reports' },
		{ name: 'Weekly Report', description: 'Site weekly reports' },
		{ name: 'Monthly Report', description: 'Site monthly reports' },
		{ name: 'NCR', description: 'Non-Conformance Reports' },
		{ name: 'Incident Report', description: 'Safety incident reports' },
		{ name: 'Risk Assessment', description: 'Risk assessment documents' },
		{ name: 'Permit', description: 'Work permits' }
	];

	await Promise.all(
		documentTypes.map(dt => {
			const publicId = `doctype-${dt.name.toLowerCase().replace(/\s+/g, '-')}`;
			return prisma.documentType.upsert({
				where: { publicId },
				update: {},
				create: {
					publicId,
					name: dt.name,
					description: dt.description
				}
			});
		})
	);

	console.log('Seed completed successfully!');
	console.log('Default admin user: admin@system.com / admin123');
}

function generatePublicId(): string {
	return crypto.randomUUID().replace(/-/g, '').substring(0, 12);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
