<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const user = $derived(data.user as any);
	const permissions: string[] = $derived(user?.permissions ?? []);

	function can(permission: string): boolean {
		return permissions.includes(permission);
	}

	function formatMWK(value: number | string | null | undefined): string {
		const amount = Number(value ?? 0);
		if (amount >= 1_000_000_000) return `MWK ${(amount / 1_000_000_000).toFixed(1)}B`;
		if (amount >= 1_000_000) return `MWK ${(amount / 1_000_000).toFixed(1)}M`;
		if (amount >= 1_000) return `MWK ${(amount / 1_000).toFixed(0)}K`;
		return `MWK ${amount.toLocaleString()}`;
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function daysUntil(value: string): number {
		return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
	}

	const cards = $derived([
		{
			label: 'Active tenders',
			value: data.stats.activeTenders,
			hint: `${data.stats.closingSoon} closing in 30 days`,
			icon: 'mdi:file-document-multiple',
			href: '/bidding',
			show: can('view_tenders')
		},
		{
			label: 'Live projects',
			value: data.stats.activeProjects,
			hint: 'Contracts under execution',
			icon: 'mdi:hammer-wrench',
			href: '/projects',
			show: can('view_projects')
		},
		{
			label: 'Active sites',
			value: data.stats.activeSites,
			hint: 'Sites currently running',
			icon: 'mdi:map-marker',
			href: '/site-management',
			show: can('view_sites')
		},
		{
			label: 'Workforce',
			value: data.stats.activeEmployees,
			hint: 'Active employees',
			icon: 'mdi:account-group',
			href: '/hr/employees',
			show: can('view_employees')
		},
		{
			label: 'Documents',
			value: data.stats.activeDocuments,
			hint: 'Controlled records',
			icon: 'mdi:folder-multiple',
			href: '/documents',
			show: can('view_documents')
		},
		{
			label: 'Payroll outstanding',
			value: formatMWK(data.stats.pendingPayroll),
			hint: 'Draft, calculated and approved',
			icon: 'mdi:cash',
			href: '/hr/payroll',
			show: can('manage_payroll')
		}
	]);
</script>

<div class="p-6">
	<div class="mb-6">
		<h1 class="text-lg font-bold text-gray-800">
			Good day{user?.firstname ? `, ${user.firstname}` : ''}
		</h1>
		<p class="text-xs text-gray-500 mt-1">
			Here is where the business stands across tenders, projects, sites and people.
		</p>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
		{#each cards.filter((card) => card.show) as card}
			<a href={card.href} class="bg-white p-4 shadow hover:shadow-md transition-shadow group">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[10px] uppercase tracking-wide text-gray-500">{card.label}</p>
						<p class="text-xl font-semibold text-gray-800 mt-1">{card.value}</p>
						<p class="text-[10px] text-gray-400 mt-1">{card.hint}</p>
					</div>
					<div class="w-9 h-9 bg-[#e8f8f7] flex items-center justify-center group-hover:bg-[#5fc5c0] transition-colors">
						<Icon icon={card.icon} class="w-4 h-4 text-[#114a4b] group-hover:text-white" />
					</div>
				</div>
			</a>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-white shadow">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-xs font-semibold text-gray-800">Tenders closing soon</h2>
				<a href="/bidding" class="text-[10px] text-[#5fc5c0] hover:underline">View all</a>
			</div>
			<div class="divide-y divide-gray-100">
				{#each data.tenders as tender}
					<a href={`/bidding/${tender.id}`} class="flex items-center justify-between p-4 hover:bg-gray-50">
						<div class="min-w-0">
							<p class="text-xs font-medium text-gray-800 truncate">{tender.title}</p>
							<p class="text-[10px] text-gray-500 truncate">{tender.client}</p>
						</div>
						<div class="text-right ml-3 flex-shrink-0">
							<p class="text-[10px] text-gray-600">{formatDate(tender.closingDate)}</p>
							<p class="text-[10px] {daysUntil(tender.closingDate) <= 7 ? 'text-red-600' : 'text-gray-400'}">
								{daysUntil(tender.closingDate)} days
							</p>
						</div>
					</a>
				{:else}
					<p class="p-6 text-xs text-gray-500">No tenders with open closing dates.</p>
				{/each}
			</div>
		</div>

		<div class="bg-white shadow">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-xs font-semibold text-gray-800">Site progress</h2>
				<a href="/site-management" class="text-[10px] text-[#5fc5c0] hover:underline">View all</a>
			</div>
			<div class="p-4 space-y-4">
				{#each data.sites as site}
					<a href={`/site-management/${site.id}`} class="block group">
						<div class="flex items-center justify-between text-[11px]">
							<span class="text-gray-700 group-hover:text-[#114a4b]">{site.name}</span>
							<span class="text-gray-500">{site.progress}%</span>
						</div>
						<div class="w-full bg-gray-200 h-1.5 mt-1">
							<div class="bg-[#5fc5c0] h-1.5" style={`width: ${site.progress}%`}></div>
						</div>
						<p class="text-[10px] text-gray-400 mt-1">{site.location ?? site.client ?? ''}</p>
					</a>
				{:else}
					<p class="text-xs text-gray-500">No active sites.</p>
				{/each}
			</div>
		</div>
	</div>

	<div class="mt-6 flex flex-wrap gap-2">
		{#if can('create_tenders')}
			<a href="/bidding" class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b]">
				<Icon icon="mdi:plus" class="w-4 h-4" />
				Log a tender
			</a>
		{/if}
		{#if can('create_projects')}
			<a href="/projects" class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-100">
				<Icon icon="mdi:plus" class="w-4 h-4" />
				Open a project
			</a>
		{/if}
		{#if can('upload_documents')}
			<a href="/documents" class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-100">
				<Icon icon="mdi:upload" class="w-4 h-4" />
				Upload a document
			</a>
		{/if}
	</div>
</div>
