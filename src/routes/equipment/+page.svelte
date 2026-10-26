<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import { uploadEvidence } from '$lib/upload';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const equipment = $derived(data.equipment as any[]);
	const logs = $derived(data.logs as any[]);

	let modal = $state('');
	let submitting = $state(false);
	let evidenceFile = $state<File | null>(null);

	let equipmentForm = $state({ name: '', code: '', category: '', ownership: 'Owned', status: 'Active', hourlyRate: '', dailyRate: '', projectId: '', siteId: '' });
	let logForm = $state({ equipmentId: '', type: 'Fuel', logDate: today(), hours: '', quantity: '', unitCost: '', cost: '', projectId: '', siteId: '', notes: '', documentId: '' });

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function formatMWK(value: number | string | null | undefined): string {
		const amount = Number(value ?? 0);
		if (amount >= 1_000_000) return `MWK ${(amount / 1_000_000).toFixed(1)}M`;
		if (amount >= 1_000) return `MWK ${(amount / 1_000).toFixed(0)}K`;
		return `MWK ${amount.toLocaleString()}`;
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function statusClass(status: string): string {
		if (status === 'Active') return 'bg-emerald-50 text-emerald-700';
		if (status === 'Maintenance') return 'bg-red-50 text-red-700';
		if (status === 'Idle') return 'bg-amber-50 text-amber-700';
		return 'bg-gray-100 text-gray-700';
	}

	function totalCost(): number {
		return logs.reduce((sum, log) => sum + Number(log.cost ?? 0), 0);
	}

	function utilisationHours(): number {
		return logs.filter((log) => log.type === 'Utilisation').reduce((sum, log) => sum + Number(log.hours ?? 0), 0);
	}

	async function createEquipment(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/equipment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...equipmentForm, projectId: equipmentForm.projectId || null, siteId: equipmentForm.siteId || null })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Equipment registered');
			modal = '';
			equipmentForm = { name: '', code: '', category: '', ownership: 'Owned', status: 'Active', hourlyRate: '', dailyRate: '', projectId: '', siteId: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not register equipment');
		} finally {
			submitting = false;
		}
	}

	async function createLog(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			let documentId = logForm.documentId;
			if (evidenceFile) {
				const equipmentName =
					equipment.find((item) => item.id === logForm.equipmentId)?.name ?? 'Equipment';
				const uploaded = await uploadEvidence(evidenceFile, {
					title: `${logForm.type} — ${equipmentName} — ${logForm.logDate}`,
					projectId: logForm.projectId || undefined
				});
				documentId = uploaded.id;
			}

			const response = await fetch('/api/equipment/logs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...logForm,
					documentId,
					projectId: logForm.projectId || null,
					siteId: logForm.siteId || null
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Equipment log recorded');
			modal = '';
			evidenceFile = null;
			logForm = { equipmentId: '', type: 'Fuel', logDate: today(), hours: '', quantity: '', unitCost: '', cost: '', projectId: '', siteId: '', notes: '', documentId: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not record log');
		} finally {
			submitting = false;
		}
	}

	function openLog(item?: any) {
		evidenceFile = null;
		logForm = { equipmentId: item?.id ?? '', type: 'Fuel', logDate: today(), hours: '', quantity: '', unitCost: '', cost: '', projectId: item?.projectId ? String(item.projectId) : '', siteId: item?.siteId ? String(item.siteId) : '', notes: '', documentId: '' };
		modal = 'log';
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Equipment & Fleet</h1>
			<p class="text-xs text-gray-500 mt-1">Plant register, utilisation, fuel and maintenance — costs flow to the project ledger.</p>
		</div>
		<div class="flex gap-2">
			<button onclick={() => openLog()} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">Log usage / cost</button>
			<button onclick={() => (modal = 'equipment')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">Add equipment</button>
		</div>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Assets</p><p class="text-lg font-semibold text-gray-800 mt-1">{equipment.length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Utilisation hours</p><p class="text-lg font-semibold text-gray-800 mt-1">{utilisationHours().toFixed(0)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Logged cost</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(totalCost())}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">In maintenance</p><p class="text-lg font-semibold text-red-600 mt-1">{equipment.filter((item) => item.status === 'Maintenance').length}</p></div>
	</div>

	<div class="bg-white shadow p-6 mb-6">
		<h3 class="text-xs font-semibold text-gray-700 mb-3">Plant register</h3>
		<table class="w-full">
			<thead class="bg-gray-50 border-b border-gray-200"><tr>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Equipment</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Ownership</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Assignment</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Rate</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500"></th>
			</tr></thead>
			<tbody>
				{#each equipment as item}
					<tr class="border-b border-gray-100">
						<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{item.name}</p><p class="text-[10px] text-gray-400">{item.code} · {item.category ?? 'General'}</p></td>
						<td class="px-3 py-2 text-[10px] text-gray-500">{item.ownership}</td>
						<td class="px-3 py-2 text-[10px] text-gray-500">{(data.projects as any[]).find((project) => project.id === String(item.projectId))?.name ?? 'Unassigned'}<br />{(data.sites as any[]).find((site) => site.id === String(item.siteId))?.name ?? ''}</td>
						<td class="px-3 py-2 text-right text-[10px] text-gray-600">{item.hourlyRate ? `${formatMWK(item.hourlyRate)}/h` : item.dailyRate ? `${formatMWK(item.dailyRate)}/day` : '—'}</td>
						<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(item.status)}">{item.status}</span></td>
						<td class="px-3 py-2 text-right"><button onclick={() => openLog(item)} class="text-[10px] text-[#114a4b] hover:underline">Log</button></td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No equipment registered.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="bg-white shadow p-6">
		<h3 class="text-xs font-semibold text-gray-700 mb-3">Recent equipment logs</h3>
		<table class="w-full">
			<thead class="bg-gray-50 border-b border-gray-200"><tr>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Date</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Equipment</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Type</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Hours / Qty</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Cost</th>
			</tr></thead>
			<tbody>
				{#each logs as log}
					<tr class="border-b border-gray-100">
						<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(log.logDate)}{#if log.documentId}<a href={`/documents/${log.documentId}`} class="block text-[9px] text-[#5fc5c0] hover:underline">Receipt</a>{/if}</td>
						<td class="px-3 py-2 text-[11px] text-gray-700">{log.equipment?.name}</td>
						<td class="px-3 py-2 text-[10px] text-gray-500">{log.type}</td>
						<td class="px-3 py-2 text-right text-[10px] text-gray-600">{log.hours ? `${log.hours}h` : log.quantity ? `${log.quantity}` : '—'}</td>
						<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(log.cost)}</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="px-3 py-8 text-center text-xs text-gray-500">No logs recorded.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if modal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">{modal === 'equipment' ? 'Register equipment' : 'Equipment log'}</h2>
				<button onclick={() => (modal = '')} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
			</div>

			{#if modal === 'equipment'}
				<form onsubmit={createEquipment} class="p-4 space-y-3">
					<div><label for="eqName" class="block text-[10px] font-medium text-gray-700 mb-1">Name *</label><input id="eqName" required bind:value={equipmentForm.name} class="w-full px-3 py-2 border border-gray-300 text-xs" placeholder="e.g., JCB 3CX Backhoe" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="eqCode" class="block text-[10px] font-medium text-gray-700 mb-1">Code</label><input id="eqCode" bind:value={equipmentForm.code} class="w-full px-3 py-2 border border-gray-300 text-xs" placeholder="Auto" /></div>
						<div><label for="eqCategory" class="block text-[10px] font-medium text-gray-700 mb-1">Category</label><input id="eqCategory" bind:value={equipmentForm.category} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="eqOwnership" class="block text-[10px] font-medium text-gray-700 mb-1">Ownership</label><select id="eqOwnership" bind:value={equipmentForm.ownership} class="w-full px-3 py-2 border border-gray-300 text-xs"><option>Owned</option><option>Hired</option></select></div>
						<div><label for="eqHourly" class="block text-[10px] font-medium text-gray-700 mb-1">Hourly rate (MWK)</label><input id="eqHourly" type="number" min="0" bind:value={equipmentForm.hourlyRate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="eqProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="eqProject" bind:value={equipmentForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Unassigned</option>{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></div>
						<div><label for="eqSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="eqSite" bind:value={equipmentForm.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Unassigned</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
					</div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Register</button></div>
				</form>
			{:else}
				<form onsubmit={createLog} class="p-4 space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div class="col-span-2"><label for="logEquipment" class="block text-[10px] font-medium text-gray-700 mb-1">Equipment *</label><select id="logEquipment" required bind:value={logForm.equipmentId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Select</option>{#each equipment as item}<option value={item.id}>{item.name} ({item.code})</option>{/each}</select></div>
						<div><label for="logType" class="block text-[10px] font-medium text-gray-700 mb-1">Type</label><select id="logType" bind:value={logForm.type} class="w-full px-3 py-2 border border-gray-300 text-xs"><option>Fuel</option><option>Maintenance</option><option>Repair</option><option>Utilisation</option></select></div>
						<div><label for="logDate" class="block text-[10px] font-medium text-gray-700 mb-1">Date</label><input id="logDate" type="date" bind:value={logForm.logDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="logHours" class="block text-[10px] font-medium text-gray-700 mb-1">Hours</label><input id="logHours" type="number" min="0" step="0.5" bind:value={logForm.hours} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="logQty" class="block text-[10px] font-medium text-gray-700 mb-1">Quantity (litres / units)</label><input id="logQty" type="number" min="0" bind:value={logForm.quantity} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="logUnitCost" class="block text-[10px] font-medium text-gray-700 mb-1">Unit cost (MWK)</label><input id="logUnitCost" type="number" min="0" bind:value={logForm.unitCost} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="logCost" class="block text-[10px] font-medium text-gray-700 mb-1">Total cost (MWK)</label><input id="logCost" type="number" min="0" bind:value={logForm.cost} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="logProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="logProject" bind:value={logForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Default</option>{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></div>
						<div><label for="logSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="logSite" bind:value={logForm.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Default</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
					</div>
					<div><label for="logNotes" class="block text-[10px] font-medium text-gray-700 mb-1">Notes</label><input id="logNotes" bind:value={logForm.notes} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div>
						<label for="logFile" class="block text-[10px] font-medium text-gray-700 mb-1">Upload fuel receipt / workshop invoice from PC</label>
						<input
							id="logFile"
							type="file"
							accept="image/*,application/pdf"
							onchange={(event) => (evidenceFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
							class="w-full px-3 py-2 border border-gray-300 text-xs file:mr-3 file:px-2 file:py-1 file:border-0 file:bg-[#e8f8f7] file:text-[#114a4b] file:text-[11px]"
						/>
						{#if evidenceFile}
							<p class="text-[10px] text-emerald-700 mt-1">Selected: {evidenceFile.name}</p>
						{/if}
					</div>
					<div>
						<label for="logDocument" class="block text-[10px] font-medium text-gray-700 mb-1">…or select an existing document</label>
						<select id="logDocument" bind:value={logForm.documentId} class="w-full px-3 py-2 border border-gray-300 text-xs">
							<option value="">None</option>
							{#each data.documents as document}<option value={document.id}>{document.title}</option>{/each}
						</select>
					</div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Save log</button></div>
				</form>
			{/if}
		</div>
	</div>
{/if}
