<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';

	let expandedSections = $state<Set<string>>(new Set());

	function toggleSection(section: string) {
		if (expandedSections.has(section)) {
			expandedSections.delete(section);
		} else {
			expandedSections.add(section);
		}
		expandedSections = new Set(expandedSections);
	}

	const menuItems = [
		{
			title: 'Dashboard',
			icon: 'mdi:chart-box',
			items: [
				{ label: 'Dashboard', href: '/dashboard', icon: 'mdi:view-dashboard' },
				{ label: 'My Tasks', href: '/dashboard/tasks', icon: 'mdi:clipboard-list' },
				{ label: 'Notifications', href: '/dashboard/notifications', icon: 'mdi:bell' }
			]
		},
		{
			title: 'Tender & Bid Management',
			icon: 'mdi:file-document-multiple',
			items: [
				{ label: 'Tender Opportunities', href: '/tenders/opportunities', icon: 'mdi:file-search' },
				{ label: 'Bid Calendar', href: '/tenders/calendar', icon: 'mdi:calendar' },
				{ label: 'Bid Teams', href: '/tenders/teams', icon: 'mdi:account-group' },
				{ label: 'BOQ Preparation', href: '/tenders/boq', icon: 'mdi:clipboard-text' },
				{ label: 'Cost Estimation', href: '/tenders/estimation', icon: 'mdi:calculator' },
				{ label: 'Technical Proposals', href: '/tenders/technical', icon: 'mdi:file-document' },
				{ label: 'Financial Proposals', href: '/tenders/financial', icon: 'mdi:currency-usd' },
				{ label: 'Bid Documents', href: '/tenders/documents', icon: 'mdi:folder' },
				{ label: 'Bid Approvals', href: '/tenders/approvals', icon: 'mdi:check-circle' },
				{ label: 'Bid Submission', href: '/tenders/submission', icon: 'mdi:send' },
				{ label: 'Clarifications', href: '/tenders/clarifications', icon: 'mdi:help-circle' },
				{ label: 'Awarded Projects', href: '/tenders/awarded', icon: 'mdi:trophy' },
				{ label: 'Bid Analysis', href: '/tenders/analysis', icon: 'mdi:chart-line' }
			]
		},
		{
			title: 'Project Management',
			icon: 'mdi:hammer-wrench',
			items: [
				{ label: 'Projects', href: '/projects', icon: 'mdi:project-management' },
				{ label: 'Project Phases', href: '/projects/phases', icon: 'mdi:layers' },
				{ label: 'Work Breakdown Structure', href: '/projects/wbs', icon: 'mdi:account-tree' },
				{ label: 'Milestones', href: '/projects/milestones', icon: 'mdi:flag' },
				{ label: 'Project Schedule', href: '/projects/schedule', icon: 'mdi:calendar-clock' },
				{ label: 'Resource Planning', href: '/projects/resources', icon: 'mdi:account-hard-hat' },
				{ label: 'Budget Allocation', href: '/projects/budget', icon: 'mdi:wallet' },
				{ label: 'Change Requests', href: '/projects/changes', icon: 'mdi:swap-horizontal' },
				{ label: 'Project Risks', href: '/projects/risks', icon: 'mdi:alert' },
				{ label: 'Progress Tracking', href: '/projects/progress', icon: 'mdi:progress-check' },
				{ label: 'Project Documents', href: '/projects/documents', icon: 'mdi:folder-multiple' },
				{ label: 'Project Closure', href: '/projects/closure', icon: 'mdi:check-all' }
			]
		},
		{
			title: 'Site Management',
			icon: 'mdi:map-marker',
			items: [
				{ label: 'Sites', href: '/sites', icon: 'mdi:office-building' },
				{ label: 'Site Engineers', href: '/sites/engineers', icon: 'mdi:account-tie' },
				{ label: 'Site Supervisors', href: '/sites/supervisors', icon: 'mdi:account-badge' },
				{ label: 'Daily Site Diary', href: '/sites/diary', icon: 'mdi:book-open' },
				{ label: 'Daily Reports', href: '/sites/daily-reports', icon: 'mdi:file-document' },
				{ label: 'Weekly Reports', href: '/sites/weekly-reports', icon: 'mdi:calendar-week' },
				{ label: 'Monthly Reports', href: '/sites/monthly-reports', icon: 'mdi:calendar-month' },
				{ label: 'Site Attendance', href: '/sites/attendance', icon: 'mdi:clipboard-account' },
				{ label: 'Visitors', href: '/sites/visitors', icon: 'mdi:account-multiple' },
				{ label: 'Weather Log', href: '/sites/weather', icon: 'mdi:weather-cloudy' },
				{ label: 'Site Photos', href: '/sites/photos', icon: 'mdi:image' },
				{ label: 'Site Issues', href: '/sites/issues', icon: 'mdi:alert-circle' },
				{ label: 'Site Requests', href: '/sites/requests', icon: 'mdi:file-request' },
				{ label: 'Site Checklist', href: '/sites/checklist', icon: 'mdi:checklist' }
			]
		},
		{
			title: 'Engineering',
			icon: 'mdi:ruler',
			items: [
				{ label: 'Drawings', href: '/engineering/drawings', icon: 'mdi:file-cad' },
				{ label: 'Drawing Revisions', href: '/engineering/revisions', icon: 'mdi:file-replace' },
				{ label: 'Shop Drawings', href: '/engineering/shop-drawings', icon: 'mdi:file-cad-box' },
				{ label: 'Material Specifications', href: '/engineering/specs', icon: 'mdi:file-document-outline' },
				{ label: 'Technical Submittals', href: '/engineering/submittals', icon: 'mdi:file-send' },
				{ label: 'RFIs', href: '/engineering/rfi', icon: 'mdi:help' },
				{ label: 'Method Statements', href: '/engineering/methods', icon: 'mdi:file-document-edit' },
				{ label: 'Design Reviews', href: '/engineering/reviews', icon: 'mdi:clipboard-check' },
				{ label: 'BOQ Library', href: '/engineering/boq', icon: 'mdi:bookshelf' },
				{ label: 'As-Built Drawings', href: '/engineering/as-built', icon: 'mdi:file-cad' }
			]
		},
		{
			title: 'Procurement',
			icon: 'mdi:cart',
			items: [
				{ label: 'Purchase Requests', href: '/procurement/requests', icon: 'mdi:file-plus' },
				{ label: 'RFQs', href: '/procurement/rfq', icon: 'mdi:file-question' },
				{ label: 'Supplier Quotations', href: '/procurement/quotations', icon: 'mdi:receipt' },
				{ label: 'Supplier Comparison', href: '/procurement/comparison', icon: 'mdi:compare' },
				{ label: 'Purchase Orders', href: '/procurement/orders', icon: 'mdi:cart-arrow-down' },
				{ label: 'Goods Received Notes', href: '/procurement/grn', icon: 'mdi:package-check' },
				{ label: 'Purchase Returns', href: '/procurement/returns', icon: 'mdi:cart-remove' },
				{ label: 'Supplier Invoices', href: '/procurement/invoices', icon: 'mdi:receipt-text' },
				{ label: 'Suppliers', href: '/procurement/suppliers', icon: 'mdi:truck' },
				{ label: 'Contracts', href: '/procurement/contracts', icon: 'mdi:file-sign' }
			]
		},
		{
			title: 'Inventory & Warehouse',
			icon: 'mdi:package-variant',
			items: [
				{ label: 'Warehouses', href: '/inventory/warehouses', icon: 'mdi:warehouse' },
				{ label: 'Materials', href: '/inventory/materials', icon: 'mdi:cube' },
				{ label: 'Categories', href: '/inventory/categories', icon: 'mdi:folder-multiple' },
				{ label: 'Stock In', href: '/inventory/stock-in', icon: 'mdi:arrow-down-bold' },
				{ label: 'Stock Out', href: '/inventory/stock-out', icon: 'mdi:arrow-up-bold' },
				{ label: 'Material Requests', href: '/inventory/requests', icon: 'mdi:file-request' },
				{ label: 'Material Issues', href: '/inventory/issues', icon: 'mdi:package-variant-closed' },
				{ label: 'Stock Transfers', href: '/inventory/transfers', icon: 'mdi:swap-horizontal' },
				{ label: 'Stock Count', href: '/inventory/count', icon: 'mdi:counter' },
				{ label: 'Reorder Levels', href: '/inventory/reorder', icon: 'mdi:alert-box' }
			]
		},
		{
			title: 'Equipment & Fleet',
			icon: 'mdi:tractor',
			items: [
				{ label: 'Equipment', href: '/equipment', icon: 'mdi:excavator' },
				{ label: 'Vehicles', href: '/equipment/vehicles', icon: 'mdi:truck' },
				{ label: 'Drivers', href: '/equipment/drivers', icon: 'mdi:account-tie-hat' },
				{ label: 'Fuel Management', href: '/equipment/fuel', icon: 'mdi:gas-station' },
				{ label: 'Maintenance', href: '/equipment/maintenance', icon: 'mdi:wrench' },
				{ label: 'Service Schedule', href: '/equipment/service', icon: 'mdi:calendar-clock' },
				{ label: 'Breakdowns', href: '/equipment/breakdowns', icon: 'mdi:alert' },
				{ label: 'Spare Parts', href: '/equipment/parts', icon: 'mdi:cog' },
				{ label: 'Vehicle Trips', href: '/equipment/trips', icon: 'mdi:map-marker-path' },
				{ label: 'Tyre Management', href: '/equipment/tyres', icon: 'mdi:car-tire-rotation' },
				{ label: 'Equipment Allocation', href: '/equipment/allocation', icon: 'mdi:account-arrow-right' },
				{ label: 'Utilization Reports', href: '/equipment/utilization', icon: 'mdi:chart-pie' }
			]
		},
		{
			title: 'Human Resources',
			icon: 'mdi:account-group',
			items: [
				{ label: 'Employees', href: '/hr/employees', icon: 'mdi:account' },
				{ label: 'Departments', href: '/hr/departments', icon: 'mdi:office-building' },
				{ label: 'Positions', href: '/hr/positions', icon: 'mdi:badge-account' },
				{ label: 'Recruitment', href: '/hr/recruitment', icon: 'mdi:account-plus' },
				{ label: 'Contracts', href: '/hr/contracts', icon: 'mdi:file-sign' },
				{ label: 'Attendance', href: '/hr/attendance', icon: 'mdi:clipboard-check' },
				{ label: 'Leave Management', href: '/hr/leave', icon: 'mdi:calendar-remove' },
				{ label: 'Timesheets', href: '/hr/timesheets', icon: 'mdi:clock-outline' },
				{ label: 'Payroll', href: '/hr/payroll', icon: 'mdi:cash' },
				{ label: 'Performance Reviews', href: '/hr/performance', icon: 'mdi:star' },
				{ label: 'Training', href: '/hr/training', icon: 'mdi:school' },
				{ label: 'Employee Documents', href: '/hr/documents', icon: 'mdi:folder-account' }
			]
		},
		{
			title: 'Finance',
			icon: 'mdi:finance',
			items: [
				{ label: 'Dashboard', href: '/finance', icon: 'mdi:view-dashboard' },
				{ label: 'Accounts Receivable', href: '/finance/receivable', icon: 'mdi:arrow-left-bold' },
				{ label: 'Accounts Payable', href: '/finance/payable', icon: 'mdi:arrow-right-bold' },
				{ label: 'General Ledger', href: '/finance/ledger', icon: 'mdi:book' },
				{ label: 'Journal Entries', href: '/finance/journal', icon: 'mdi:notebook' },
				{ label: 'Bank Accounts', href: '/finance/bank', icon: 'mdi:bank' },
				{ label: 'Bank Reconciliation', href: '/finance/reconciliation', icon: 'mdi:bank-check' },
				{ label: 'Petty Cash', href: '/finance/petty-cash', icon: 'mdi:cash-multiple' },
				{ label: 'Budgets', href: '/finance/budgets', icon: 'mdi:chart-bar' },
				{ label: 'Project Costing', href: '/finance/costing', icon: 'mdi:calculator-variant' },
				{ label: 'Invoices', href: '/finance/invoices', icon: 'mdi:receipt' },
				{ label: 'Payment Certificates', href: '/finance/certificates', icon: 'mdi:certificate' },
				{ label: 'Fixed Assets', href: '/finance/assets', icon: 'mdi:domain' },
				{ label: 'Financial Reports', href: '/finance/reports', icon: 'mdi:chart-line' },
				{ label: 'Tax Management', href: '/finance/tax', icon: 'mdi:percent' }
			]
		},
		{
			title: 'Quality Management',
			icon: 'mdi:check-circle',
			items: [
				{ label: 'Inspection Requests', href: '/quality/inspections', icon: 'mdi:clipboard-check' },
				{ label: 'Material Inspections', href: '/quality/materials', icon: 'mdi:cube-scan' },
				{ label: 'Site Inspections', href: '/quality/site', icon: 'mdi:map-marker-check' },
				{ label: 'NCR Management', href: '/quality/ncr', icon: 'mdi:alert-circle' },
				{ label: 'Corrective Actions', href: '/quality/actions', icon: 'mdi:hammer' },
				{ label: 'Test Reports', href: '/quality/tests', icon: 'mdi:flask' },
				{ label: 'Quality Audits', href: '/quality/audits', icon: 'mdi:clipboard-text' },
				{ label: 'Checklists', href: '/quality/checklists', icon: 'mdi:checklist' }
			]
		},
		{
			title: 'Health, Safety',
			icon: 'mdi:shield-account',
			items: [
				{ label: 'Safety Dashboard', href: '/hse', icon: 'mdi:view-dashboard' },
				{ label: 'Incident Reports', href: '/hse/incidents', icon: 'mdi:alert' },
				{ label: 'Near Misses', href: '/hse/near-misses', icon: 'mdi:alert-outline' },
				{ label: 'Risk Assessments', href: '/hse/risks', icon: 'mdi:shield-alert' },
				{ label: 'Toolbox Talks', href: '/hse/toolbox', icon: 'mdi:account-voice' },
				{ label: 'PPE Management', href: '/hse/ppe', icon: 'mdi:hard-hat' },
				{ label: 'Safety Inspections', href: '/hse/inspections', icon: 'mdi:clipboard-check' },
				{ label: 'Permits', href: '/hse/permits', icon: 'mdi:card-account-details' },
				{ label: 'Emergency Contacts', href: '/hse/emergency', icon: 'mdi:phone' },
				{ label: 'Safety Audits', href: '/hse/audits', icon: 'mdi:clipboard-text' }
			]
		},
		{
			title: 'Document Management',
			icon: 'mdi:folder',
			items: [
				{ label: 'Project Documents', href: '/documents/projects', icon: 'mdi:folder-multiple' },
				{ label: 'Contracts', href: '/documents/contracts', icon: 'mdi:file-sign' },
				{ label: 'Drawings', href: '/documents/drawings', icon: 'mdi:file-cad' },
				{ label: 'RFIs', href: '/documents/rfi', icon: 'mdi:help' },
				{ label: 'Technical Documents', href: '/documents/technical', icon: 'mdi:file-document' },
				{ label: 'Photos', href: '/documents/photos', icon: 'mdi:image' },
				{ label: 'Videos', href: '/documents/videos', icon: 'mdi:video' },
				{ label: 'Templates', href: '/documents/templates', icon: 'mdi:file-cog' },
				{ label: 'Version History', href: '/documents/versions', icon: 'mdi:history' },
				{ label: 'Archive', href: '/documents/archive', icon: 'mdi:archive' }
			]
		},
		{
			title: 'Reports & Analytics',
			icon: 'mdi:chart-line',
			items: [
				{ label: 'Executive Dashboard', href: '/reports/executive', icon: 'mdi:view-dashboard' },
				{ label: 'Project Reports', href: '/reports/projects', icon: 'mdi:project-management' },
				{ label: 'Financial Reports', href: '/reports/financial', icon: 'mdi:finance' },
				{ label: 'HR Reports', href: '/reports/hr', icon: 'mdi:account-group' },
				{ label: 'Procurement Reports', href: '/reports/procurement', icon: 'mdi:cart' },
				{ label: 'Inventory Reports', href: '/reports/inventory', icon: 'mdi:package-variant' },
				{ label: 'Fleet Reports', href: '/reports/fleet', icon: 'mdi:truck' },
				{ label: 'Equipment Reports', href: '/reports/equipment', icon: 'mdi:tractor' },
				{ label: 'Safety Reports', href: '/reports/safety', icon: 'mdi:shield-account' },
				{ label: 'Quality Reports', href: '/reports/quality', icon: 'mdi:check-circle' },
				{ label: 'Custom Reports', href: '/reports/custom', icon: 'mdi:cog' }
			]
		}
	];
</script>

<aside class="w-80 bg-white h-screen fixed left-0 top-0 overflow-y-auto border-r border-gray-200 shadow-lg">
	<div class="p-6">
		<h2 class="text-lg font-bold text-gray-800 mb-4">Menu</h2>
		
		<nav class="space-y-2">
			{#each menuItems as section}
				<div class="mb-2">
					<button
						onclick={() => toggleSection(section.title)}
						class="w-full flex items-center justify-between p-2 hover:bg-gray-100 transition-colors"
					>
						<div class="flex items-center gap-2">
							<Icon icon={section.icon} class="w-5 h-5 text-gray-600 flex-shrink-0" />
							<span class="font-semibold text-gray-700 whitespace-nowrap text-sm">{section.title}</span>
						</div>
						<Icon 
							icon={expandedSections.has(section.title) ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
							class="w-4 h-4 text-gray-500 flex-shrink-0" 
						/>
					</button>
					
					{#if expandedSections.has(section.title)}
						<div class="ml-4 mt-2 space-y-1">
							{#each section.items as item}
								<a
									href={item.href}
									class="flex items-center gap-2 p-2 hover:bg-gray-100 transition-colors {$page.url.pathname === item.href ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}"
								>
									<Icon icon={item.icon} class="w-4 h-4 flex-shrink-0" />
									<span class="text-xs whitespace-nowrap">{item.label}</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</nav>
	</div>
</aside>
