<script lang="ts">
	import Icon from '@iconify/svelte';

	let activeTab = $state('administration');

	const tabs = [
		{ id: 'administration', label: 'Administration' },
		{ id: 'security', label: 'Security & Access' }
	];

	const administrationItems = [
		{ label: 'Company Profile', href: '/admin/profile', icon: 'mdi:office-building' },
		{ label: 'Branches', href: '/admin/branches', icon: 'mdi:map-marker-multiple' },
		{ label: 'Departments', href: '/admin/departments', icon: 'mdi:office-building' },
		{ label: 'Cost Centers', href: '/admin/cost-centers', icon: 'mdi:chart-bar' },
		{ label: 'Holidays', href: '/admin/holidays', icon: 'mdi:calendar-star' },
		{ label: 'Currencies', href: '/admin/currencies', icon: 'mdi:cash' },
		{ label: 'Tax Settings', href: '/admin/tax', icon: 'mdi:percent' },
		{ label: 'Workflow Approvals', href: '/admin/workflows', icon: 'mdi:account-tree' },
		{ label: 'Notification Settings', href: '/admin/notifications', icon: 'mdi:bell-cog' },
		{ label: 'System Configuration', href: '/admin/system', icon: 'mdi:cog-box' }
	];

	const securityItems = [
		{ label: 'Users', href: '/security/users', icon: 'mdi:account' },
		{ label: 'Roles', href: '/security/roles', icon: 'mdi:account-key' },
		{ label: 'Permissions', href: '/security/permissions', icon: 'mdi:key' },
		{ label: 'Permission Groups', href: '/security/groups', icon: 'mdi:account-group' },
		{ label: 'Audit Logs', href: '/security/audit', icon: 'mdi:clipboard-list' },
		{ label: 'Activity Logs', href: '/security/activity', icon: 'mdi:history' },
		{ label: 'Login Sessions', href: '/security/sessions', icon: 'mdi:login' },
		{ label: 'Backup & Restore', href: '/security/backup', icon: 'mdi:backup-restore' }
	];
</script>

<div class="p-6">
	<h1 class="text-sm font-bold text-gray-800 mb-6">Settings</h1>
	
	<!-- Tabs -->
	<div class="flex border-b border-gray-200 mb-6">
		{#each tabs as tab}
			<button
				onclick={() => activeTab = tab.id}
				class="px-4 py-2 font-medium transition-colors text-xs {activeTab === tab.id ? 'text-[#5fc5c0] border-b-2 border-[#5fc5c0]' : 'text-gray-500 hover:text-gray-700'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Tab Content -->
	<div class="bg-white shadow">
		{#if activeTab === 'administration'}
			<div class="p-6">
				<h2 class="text-xs font-semibold text-gray-800 mb-4">Administration</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each administrationItems as item}
						<a href={item.href} class="flex items-center gap-2 p-2 border border-gray-200 hover:bg-gray-50 transition-colors">
							<Icon icon={item.icon} class="w-3 h-3 text-gray-600" />
							<span class="text-[10px] font-medium text-gray-700">{item.label}</span>
						</a>
					{/each}
				</div>
			</div>
		{:else if activeTab === 'security'}
			<div class="p-6">
				<h2 class="text-xs font-semibold text-gray-800 mb-4">Security & Access</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each securityItems as item}
						<a href={item.href} class="flex items-center gap-2 p-2 border border-gray-200 hover:bg-gray-50 transition-colors">
							<Icon icon={item.icon} class="w-3 h-3 text-gray-600" />
							<span class="text-[10px] font-medium text-gray-700">{item.label}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
