/**
 * Central API authorisation policy.
 *
 * Authentication is enforced for every /api/* request in hooks.server.ts.
 * This table maps each API area to the permission required per HTTP verb.
 * A missing rule only requires a valid session (never used for sensitive data).
 */
type ApiRule = {
	prefix: string;
	read?: string;
	create?: string;
	update?: string;
	delete?: string;
};

const RULES: ApiRule[] = [
	{
		prefix: '/api/security/users',
		read: 'view_users',
		create: 'manage_users',
		update: 'manage_users',
		delete: 'manage_users'
	},
	{
		prefix: '/api/security/roles',
		read: 'manage_roles',
		create: 'manage_roles',
		update: 'manage_roles',
		delete: 'manage_roles'
	},
	{
		prefix: '/api/security/permissions',
		read: 'manage_permissions',
		create: 'manage_permissions',
		update: 'manage_permissions',
		delete: 'manage_permissions'
	},
	{
		prefix: '/api/admin/company',
		read: 'view_admin',
		create: 'manage_settings',
		update: 'manage_settings',
		delete: 'manage_settings'
	},
	{
		prefix: '/api/admin/branches',
		read: 'view_admin',
		create: 'manage_branches',
		update: 'manage_branches',
		delete: 'manage_branches'
	},
	{
		prefix: '/api/admin/departments',
		read: 'view_admin',
		create: 'manage_departments',
		update: 'manage_departments',
		delete: 'manage_departments'
	},
	{
		prefix: '/api/employees',
		read: 'view_employees',
		create: 'manage_employees',
		update: 'manage_employees',
		delete: 'manage_employees'
	},
	{
		prefix: '/api/payroll',
		read: 'manage_payroll',
		create: 'manage_payroll',
		update: 'manage_payroll',
		delete: 'manage_payroll'
	},
	{
		prefix: '/api/timesheets',
		read: 'manage_attendance',
		create: 'manage_attendance',
		update: 'manage_attendance',
		delete: 'manage_attendance'
	},
	{
		prefix: '/api/documents',
		read: 'view_documents',
		create: 'upload_documents',
		update: 'manage_documents',
		delete: 'manage_documents'
	},
	{
		prefix: '/api/projects',
		read: 'view_projects',
		create: 'create_projects',
		update: 'edit_projects',
		delete: 'delete_projects'
	},
	{
		prefix: '/api/finance/accounts',
		read: 'view_finance',
		create: 'manage_ledger',
		update: 'manage_ledger',
		delete: 'manage_ledger'
	},
	{
		prefix: '/api/finance/journal',
		read: 'view_finance',
		create: 'manage_ledger',
		update: 'manage_ledger',
		delete: 'manage_ledger'
	},
	{
		prefix: '/api/finance/invoices',
		read: 'view_finance',
		create: 'manage_invoices',
		update: 'manage_invoices',
		delete: 'manage_invoices'
	},
	{
		prefix: '/api/finance/bills',
		read: 'view_finance',
		create: 'manage_accounts_payable',
		update: 'manage_accounts_payable',
		delete: 'manage_accounts_payable'
	},
	{
		prefix: '/api/procurement/suppliers',
		read: 'view_procurement',
		create: 'manage_suppliers',
		update: 'manage_suppliers',
		delete: 'manage_suppliers'
	},
	{
		prefix: '/api/procurement/orders',
		read: 'view_procurement',
		create: 'manage_orders',
		update: 'manage_orders',
		delete: 'manage_orders'
	},
	{
		prefix: '/api/inventory/items',
		read: 'view_inventory',
		create: 'manage_materials',
		update: 'manage_materials',
		delete: 'manage_materials'
	},
	{
		prefix: '/api/inventory/movements',
		read: 'view_inventory',
		create: 'manage_stock',
		update: 'manage_stock',
		delete: 'manage_stock'
	},
	{
		prefix: '/api/inventory/warehouses',
		read: 'view_inventory',
		create: 'manage_warehouses',
		update: 'manage_warehouses',
		delete: 'manage_warehouses'
	},
	{
		prefix: '/api/equipment/logs',
		read: 'view_equipment',
		create: 'manage_fuel',
		update: 'manage_maintenance',
		delete: 'manage_maintenance'
	},
	{
		prefix: '/api/equipment',
		read: 'view_equipment',
		create: 'manage_equipment',
		update: 'manage_equipment',
		delete: 'manage_equipment'
	},
	{
		prefix: '/api/quality/inspections',
		read: 'view_quality',
		create: 'manage_inspections',
		update: 'manage_inspections',
		delete: 'manage_inspections'
	},
	{
		prefix: '/api/quality/ncrs',
		read: 'view_quality',
		create: 'manage_ncr',
		update: 'manage_ncr',
		delete: 'manage_ncr'
	},
	{
		prefix: '/api/hse/incidents',
		read: 'view_hse',
		create: 'manage_incidents',
		update: 'manage_incidents',
		delete: 'manage_incidents'
	},
	{
		prefix: '/api/engineering/rfis',
		read: 'view_drawings',
		create: 'manage_rfis',
		update: 'manage_rfis',
		delete: 'manage_rfis'
	},
	{
		prefix: '/api/tenders',
		read: 'view_tenders',
		create: 'create_tenders',
		update: 'edit_tenders',
		delete: 'delete_tenders'
	},
	{
		prefix: '/api/site-team',
		read: 'view_sites',
		create: 'manage_site_personnel',
		update: 'manage_site_personnel',
		delete: 'manage_site_personnel'
	},
	{
		prefix: '/api/site-attendance',
		read: 'view_sites',
		create: 'manage_attendance',
		update: 'manage_attendance',
		delete: 'manage_attendance'
	},
	{
		prefix: '/api/site-checklist',
		read: 'view_sites',
		create: 'edit_sites',
		update: 'edit_sites',
		delete: 'edit_sites'
	},
	{
		prefix: '/api/site-requests',
		read: 'view_sites',
		create: 'edit_sites',
		update: 'edit_sites',
		delete: 'edit_sites'
	},
	{
		prefix: '/api/sites',
		read: 'view_sites',
		create: 'create_sites',
		update: 'edit_sites',
		delete: 'delete_sites'
	}
];

function matchesPrefix(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Returns the permission required for a request, or null if a session is enough. */
export function requiredPermissionForApi(pathname: string, method: string): string | null {
	const rule = RULES.find((candidate) => matchesPrefix(pathname, candidate.prefix));
	if (!rule) return null;

	switch (method.toUpperCase()) {
		case 'GET':
		case 'HEAD':
			return rule.read ?? null;
		case 'POST':
			return rule.create ?? rule.update ?? rule.read ?? null;
		case 'DELETE':
			return rule.delete ?? rule.update ?? null;
		default:
			return rule.update ?? rule.create ?? null;
	}
}

/** Page-level permission guard used by +page.server.ts loads. */
export const PAGE_PERMISSIONS: Record<string, string> = {
	'/projects': 'view_projects',
	'/bidding': 'view_tenders',
	'/site-management': 'view_sites',
	'/documents': 'view_documents',
	'/finance': 'view_finance',
	'/procurement': 'view_procurement',
	'/inventory': 'view_inventory',
	'/equipment': 'view_equipment',
	'/quality': 'view_quality',
	'/hse': 'view_hse',
	'/engineering': 'view_drawings',
	'/reports': 'view_reports',
	'/hr/employees': 'view_employees',
	'/hr/timesheets': 'manage_attendance',
	'/hr/payroll': 'manage_payroll',
	'/hr/documents': 'view_documents',
	'/security/users': 'view_users',
	'/security/roles': 'manage_roles',
	'/security/permissions': 'manage_permissions',
	'/admin/branches': 'view_admin',
	'/admin/departments': 'view_admin',
	'/admin/profile': 'view_admin'
};

export function requiredPermissionForPage(pathname: string): string | null {
	const entry = Object.entries(PAGE_PERMISSIONS).find(
		([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
	return entry ? entry[1] : null;
}
