<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import logoPlus from '$lib/assets/shortlogo.png';
	import ConfirmDialog from './ConfirmDialog.svelte';

	type MenuItem = { label: string; href: string; icon: string; permission?: string };
	type MenuSection = {
		title: string;
		icon: string;
		href?: string;
		items?: MenuItem[];
		soon?: boolean;
		permission?: string;
	};

	let expandedSections = $state<Set<string>>(new Set());
	let showLogoutDialog = $state(false);

	const permissions = $derived(((($page.data.user as any)?.permissions ?? []) as string[]));

	function can(permission?: string): boolean {
		return !permission || permissions.includes(permission);
	}

	function toggleSection(section: string) {
		if (expandedSections.has(section)) {
			expandedSections.delete(section);
		} else {
			expandedSections.add(section);
		}
		expandedSections = new Set(expandedSections);
	}

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(`${href}/`);
	}

	function confirmLogout() {
		showLogoutDialog = false;
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/logout';
		document.body.appendChild(form);
		form.submit();
	}

	const menuItems: MenuSection[] = [
		{ title: 'Dashboard', icon: 'mdi:chart-box', href: '/dashboard' },
		{ title: 'Tender & Bid Management', icon: 'mdi:file-document-multiple', href: '/bidding', permission: 'view_tenders' },
		{ title: 'Project Management', icon: 'mdi:hammer-wrench', href: '/projects', permission: 'view_projects' },
		{ title: 'Site Management', icon: 'mdi:map-marker', href: '/site-management', permission: 'view_sites' },
		{
			title: 'Human Resources',
			icon: 'mdi:account-group',
			items: [
				{ label: 'Employees', href: '/hr/employees', icon: 'mdi:account', permission: 'view_employees' },
				{ label: 'Timesheets', href: '/hr/timesheets', icon: 'mdi:clock-outline', permission: 'manage_attendance' },
				{ label: 'Payroll', href: '/hr/payroll', icon: 'mdi:cash', permission: 'manage_payroll' },
				{ label: 'Employee Documents', href: '/hr/documents', icon: 'mdi:folder-account', permission: 'view_documents' }
			]
		},
		{ title: 'Document Management', icon: 'mdi:folder', href: '/documents', permission: 'view_documents' },
		{ title: 'Engineering', icon: 'mdi:ruler', href: '/engineering', permission: 'view_drawings' },
		{ title: 'Procurement', icon: 'mdi:cart', href: '/procurement', permission: 'view_procurement' },
		{ title: 'Inventory & Warehouse', icon: 'mdi:package-variant', href: '/inventory', permission: 'view_inventory' },
		{ title: 'Equipment & Fleet', icon: 'mdi:tractor', href: '/equipment', permission: 'view_equipment' },
		{ title: 'Finance', icon: 'mdi:finance', href: '/finance', permission: 'view_finance' },
		{ title: 'Quality Management', icon: 'mdi:check-circle', href: '/quality', permission: 'view_quality' },
		{ title: 'Health, Safety', icon: 'mdi:shield-account', href: '/hse', permission: 'view_hse' },
		{ title: 'Reports & Analytics', icon: 'mdi:chart-line', href: '/reports', permission: 'view_reports' },
		{ title: 'Settings', icon: 'mdi:cog', href: '/settings', permission: 'view_admin' }
	];

	const visibleSections = $derived(
		menuItems
			.map((section) => ({
				...section,
				items: section.items?.filter((item) => can(item.permission))
			}))
			.filter(
				(section) => can(section.permission) && (!section.items || section.items.length > 0)
			)
	);
</script>

<aside class="w-64 bg-white h-screen fixed left-0 top-0 flex flex-col border-r border-gray-200 shadow-lg">
	<div class="p-6 flex-1 overflow-y-auto">
		<div class="mb-4">
			<img src={logoPlus} alt="Company logo" class="h-11 object-contain" />
		</div>
		<h2 class="text-sm font-bold text-gray-800 mb-4">Menu</h2>

		<nav class="space-y-2">
			{#each visibleSections as section}
				<div class="mb-2">
					{#if section.soon}
						<div class="flex items-center justify-between p-2 text-gray-400 cursor-default" title="Planned module">
							<div class="flex items-center gap-2">
								<Icon icon={section.icon} class="w-4 h-4 flex-shrink-0" />
								<span class="font-semibold whitespace-nowrap text-xs">{section.title}</span>
							</div>
							<span class="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Soon</span>
						</div>
					{:else if section.href}
						<a
							href={section.href}
							class="flex items-center gap-2 p-2 transition-colors {isActive(section.href)
								? 'bg-[#e8f8f7] text-[#5fc5c0]'
								: 'text-gray-600 hover:bg-gray-100'}"
						>
							<Icon icon={section.icon} class="w-4 h-4 text-gray-600 flex-shrink-0" />
							<span class="font-semibold text-gray-700 whitespace-nowrap text-xs">{section.title}</span>
						</a>
					{:else}
						<button
							onclick={() => toggleSection(section.title)}
							class="w-full flex items-center justify-between p-2 hover:bg-gray-100 transition-colors"
						>
							<div class="flex items-center gap-2">
								<Icon icon={section.icon} class="w-4 h-4 text-gray-600 flex-shrink-0" />
								<span class="font-semibold text-gray-700 whitespace-nowrap text-xs">{section.title}</span>
							</div>
							<Icon
								icon={expandedSections.has(section.title) ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								class="w-3 h-3 text-gray-500 flex-shrink-0"
							/>
						</button>

						{#if expandedSections.has(section.title)}
							<div class="ml-4 mt-2 space-y-1">
								{#each section.items ?? [] as item}
									<a
										href={item.href}
										class="flex items-center gap-2 p-2 transition-colors {isActive(item.href)
											? 'bg-[#e8f8f7] text-[#5fc5c0]'
											: 'text-gray-600 hover:bg-gray-100'}"
									>
										<Icon icon={item.icon} class="w-3 h-3 flex-shrink-0" />
										<span class="text-[10px] whitespace-nowrap">{item.label}</span>
									</a>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</nav>
	</div>

	<div class="p-6 border-t border-gray-200 bg-white">
		<button
			onclick={() => (showLogoutDialog = true)}
			class="flex items-center gap-2 p-2 hover:bg-gray-100 transition-colors w-full"
		>
			<Icon icon="mdi:logout" class="w-4 h-4 text-gray-600" />
			<span class="font-semibold text-gray-700 whitespace-nowrap text-xs">Logout</span>
		</button>
	</div>
</aside>

<ConfirmDialog
	open={showLogoutDialog}
	title="Are you sure you want to logout?"
	message="You will be redirected to the login page."
	confirmText="Logout"
	cancelText="Cancel"
	onConfirm={confirmLogout}
	onCancel={() => (showLogoutDialog = false)}
/>
