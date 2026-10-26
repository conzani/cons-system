<script lang="ts">
	import Icon from '@iconify/svelte';

	let activeTab = $state('administration');

	const tabs = [
		{ id: 'administration', label: 'Administration' },
		{ id: 'security', label: 'Security & Access' }
	];

	const administrationItems = [
		{ label: 'Company Profile', href: '/admin/profile', icon: 'mdi:office-building', available: true },
		{ label: 'Branches', href: '/admin/branches', icon: 'mdi:map-marker-multiple', available: true },
		{ label: 'Departments', href: '/admin/departments', icon: 'mdi:office-building', available: true }
	];

	const plannedItems = [
		{ label: 'Cost Centers', icon: 'mdi:chart-bar' },
		{ label: 'Holidays', icon: 'mdi:calendar-star' },
		{ label: 'Currencies', icon: 'mdi:cash' },
		{ label: 'Tax Settings', icon: 'mdi:percent' },
		{ label: 'Workflow Approvals', icon: 'mdi:account-tree' },
		{ label: 'Notification Settings', icon: 'mdi:bell-cog' },
		{ label: 'System Configuration', icon: 'mdi:cog-box' }
	];

	const securityItems = [
		{ label: 'Users', href: '/security/users', icon: 'mdi:account', available: true },
		{ label: 'Roles', href: '/security/roles', icon: 'mdi:account-key', available: true },
		{ label: 'Permissions', href: '/security/permissions', icon: 'mdi:key', available: true },
		{ label: 'Permission Groups', href: '/security/groups', icon: 'mdi:account-group', available: false },
		{ label: 'Audit Logs', href: '/security/audit', icon: 'mdi:clipboard-list', available: false },
		{ label: 'Activity Logs', href: '/security/activity', icon: 'mdi:history', available: false },
		{ label: 'Login Sessions', href: '/security/sessions', icon: 'mdi:login', available: false },
		{ label: 'Backup & Restore', href: '/security/backup', icon: 'mdi:backup-restore', available: false }
	];
</script>

<div class="p-6">
	<h1 class="text-sm font-bold text-gray-800 mb-6">Settings</h1>

	<div class="flex border-b border-gray-200 mb-6">
		{#each tabs as tab}
			<button
				onclick={() => (activeTab = tab.id)}
				class="px-4 py-2 font-medium transition-colors text-xs {activeTab === tab.id
					? 'text-[#5fc5c0] border-b-2 border-[#5fc5c0]'
					: 'text-gray-500 hover:text-gray-700'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

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

				<h2 class="text-xs font-semibold text-gray-800 mt-8 mb-2">Planned</h2>
				<p class="text-[10px] text-gray-500 mb-4">Not yet implemented — these are recorded as roadmap, not broken links.</p>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each plannedItems as item}
						<div class="flex items-center justify-between p-2 border border-dashed border-gray-200 text-gray-400">
							<div class="flex items-center gap-2">
								<Icon icon={item.icon} class="w-3 h-3" />
								<span class="text-[10px] font-medium">{item.label}</span>
							</div>
							<span class="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Soon</span>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="p-6">
				<h2 class="text-xs font-semibold text-gray-800 mb-4">Security & Access</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each securityItems as item}
						{#if item.available}
							<a href={item.href} class="flex items-center gap-2 p-2 border border-gray-200 hover:bg-gray-50 transition-colors">
								<Icon icon={item.icon} class="w-3 h-3 text-gray-600" />
								<span class="text-[10px] font-medium text-gray-700">{item.label}</span>
							</a>
						{:else}
							<div class="flex items-center justify-between p-2 border border-dashed border-gray-200 text-gray-400">
								<div class="flex items-center gap-2">
									<Icon icon={item.icon} class="w-3 h-3" />
									<span class="text-[10px] font-medium">{item.label}</span>
								</div>
								<span class="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Soon</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
