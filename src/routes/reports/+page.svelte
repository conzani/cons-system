<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const summary = $derived(data.summary as any);
	const operations = $derived(data.operations as any);
	const projects = $derived(data.projectProfitability as any[]);
	const costs = $derived(data.costBreakdown as any[]);

	function formatMWK(value: number | string | null | undefined): string {
		const amount = Number(value ?? 0);
		const sign = amount < 0 ? '-' : '';
		const abs = Math.abs(amount);
		if (abs >= 1_000_000_000) return `${sign}MWK ${(abs / 1_000_000_000).toFixed(2)}B`;
		if (abs >= 1_000_000) return `${sign}MWK ${(abs / 1_000_000).toFixed(1)}M`;
		if (abs >= 1_000) return `${sign}MWK ${(abs / 1_000).toFixed(0)}K`;
		return `${sign}MWK ${abs.toLocaleString()}`;
	}
</script>

<div class="p-6">
	<div class="mb-6">
		<h1 class="text-lg font-bold text-gray-800">Reports & Analytics</h1>
		<p class="text-xs text-gray-500 mt-1">Executive view across commercial, delivery, workforce, plant, quality and safety.</p>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Revenue posted</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(summary.totalRevenue)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Costs posted</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(summary.totalExpenses)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Gross profit</p><p class="text-lg font-semibold {summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">{formatMWK(summary.profit)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Cash and bank</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(summary.cash)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Receivables</p><p class="text-lg font-semibold text-amber-600 mt-1">{formatMWK(summary.receivable)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Payables</p><p class="text-lg font-semibold text-red-600 mt-1">{formatMWK(summary.payable)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Payroll (gross)</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(operations.payrollGross)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Tender win rate</p><p class="text-lg font-semibold text-gray-800 mt-1">{operations.winRate === null ? '—' : `${operations.winRate}%`}</p></div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
		<div class="bg-white shadow p-6">
			<h2 class="text-xs font-semibold text-gray-700 mb-3">Cost breakdown</h2>
			<div class="space-y-2">
				{#each costs as cost}
					<div class="flex items-center justify-between border-b border-gray-100 pb-1">
						<span class="text-[11px] text-gray-600">{cost.name}</span>
						<span class="text-[11px] text-gray-800">{formatMWK(cost.amount)}</span>
					</div>
				{:else}
					<p class="text-[11px] text-gray-500">No cost postings yet. Approve payroll, receive goods, issue materials or log plant costs.</p>
				{/each}
			</div>
		</div>

		<div class="bg-white shadow p-6">
			<h2 class="text-xs font-semibold text-gray-700 mb-3">Operations snapshot</h2>
			<div class="space-y-2 text-[11px]">
				<div class="flex justify-between"><span class="text-gray-600">Procurement spend</span><span class="text-gray-800">{formatMWK(operations.procurementSpend)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Supplier balance outstanding</span><span class="text-gray-800">{formatMWK(operations.procurementOutstanding)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Inventory value</span><span class="text-gray-800">{formatMWK(operations.inventoryValue)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Plant & equipment cost</span><span class="text-gray-800">{formatMWK(operations.equipmentCost)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Open incidents</span><span class="text-gray-800">{operations.openIncidents} / {operations.incidents}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Lost-time days</span><span class="text-gray-800">{operations.lostDays}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Open NCRs</span><span class="text-gray-800">{operations.openNcrs}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Tenders tracked</span><span class="text-gray-800">{operations.tenders}</span></div>
			</div>
		</div>

		<div class="bg-white shadow p-6">
			<h2 class="text-xs font-semibold text-gray-700 mb-3">Balance sheet position</h2>
			<div class="space-y-2 text-[11px]">
				<div class="flex justify-between"><span class="text-gray-600">Cash and bank</span><span class="text-gray-800">{formatMWK(summary.cash)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Receivables</span><span class="text-gray-800">{formatMWK(summary.receivable)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Payables</span><span class="text-gray-800">{formatMWK(summary.payable)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Inventory (book)</span><span class="text-gray-800">{formatMWK(operations.inventoryValue)}</span></div>
				<div class="flex justify-between"><span class="text-gray-600">Posted profit</span><span class="text-gray-800">{formatMWK(summary.profit)}</span></div>
			</div>
		</div>
	</div>

	<div class="bg-white shadow p-6">
		<h2 class="text-xs font-semibold text-gray-700 mb-4">Project profitability</h2>
		<table class="w-full">
			<thead class="bg-gray-50 border-b border-gray-200"><tr>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Contract</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Invoiced</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Costs</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Margin</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Progress</th>
			</tr></thead>
			<tbody>
				{#each projects as project}
					<tr class="border-b border-gray-100">
						<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{project.name}</p><p class="text-[10px] text-gray-400">{project.projectNumber} · {project.status}</p></td>
						<td class="px-3 py-2 text-right text-[11px] text-gray-700">{project.value ? formatMWK(project.value) : '—'}</td>
						<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(project.invoiced)}</td>
						<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(project.cost)}</td>
						<td class="px-3 py-2 text-right text-[11px] font-semibold {project.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}">{formatMWK(project.margin)}</td>
						<td class="px-3 py-2">
							<div class="w-28 bg-gray-200 h-1.5"><div class="bg-[#5fc5c0] h-1.5" style={`width: ${project.progress ?? 0}%`}></div></div>
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No projects yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
