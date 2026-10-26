<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const items = $derived(data.items as any[]);
	const warehouses = $derived(data.warehouses as any[]);
	const movements = $derived(data.movements as any[]);

	let tab = $state('stock');
	let modal = $state('');
	let submitting = $state(false);

	let itemForm = $state({ name: '', code: '', category: '', unit: 'units', unitCost: '', reorderLevel: '' });
	let movementForm = $state({ itemId: '', warehouseId: '', type: 'Out', quantity: '', unitCost: '', projectId: '', siteId: '', notes: '', movementDate: today() });
	let warehouseForm = $state({ name: '', location: '' });

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

	function stockValue(): number {
		return items.reduce((sum, item) => sum + Number(item.stock ?? 0) * Number(item.unitCost ?? 0), 0);
	}

	function lowStock(): number {
		return items.filter((item) => Number(item.stock ?? 0) <= Number(item.reorderLevel ?? 0)).length;
	}

	async function createItem(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/inventory/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(itemForm)
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Item added');
			modal = '';
			itemForm = { name: '', code: '', category: '', unit: 'units', unitCost: '', reorderLevel: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not add item');
		} finally {
			submitting = false;
		}
	}

	async function createMovement(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/inventory/movements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...movementForm,
					projectId: movementForm.projectId || null,
					siteId: movementForm.siteId || null,
					unitCost: movementForm.unitCost || undefined
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success(movementForm.type === 'Out' ? 'Material issued to site' : 'Stock received');
			modal = '';
			movementForm = { itemId: '', warehouseId: '', type: 'Out', quantity: '', unitCost: '', projectId: '', siteId: '', notes: '', movementDate: today() };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not record movement');
		} finally {
			submitting = false;
		}
	}

	async function createWarehouse(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/inventory/warehouses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(warehouseForm)
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Store created');
			modal = '';
			warehouseForm = { name: '', location: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create store');
		} finally {
			submitting = false;
		}
	}

	function openMovement(type: 'In' | 'Out', item?: any) {
		movementForm = {
			itemId: item?.id ?? '',
			warehouseId: warehouses[0]?.id ?? '',
			type,
			quantity: '',
			unitCost: item?.unitCost ? String(item.unitCost) : '',
			projectId: '',
			siteId: '',
			notes: '',
			movementDate: today()
		};
		modal = 'movement';
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Inventory & Warehouse</h1>
			<p class="text-xs text-gray-500 mt-1">Materials on hand, issues to site, and automatic costing into the ledger.</p>
		</div>
		<div class="flex gap-2">
			<button onclick={() => openMovement('In')} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">Receive stock</button>
			<button onclick={() => openMovement('Out')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">Issue to site</button>
			<button onclick={() => (modal = 'item')} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">New item</button>
		</div>
	</div>

	<div class="grid grid-cols-3 gap-4 mb-6">
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Stock value</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(stockValue())}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Items tracked</p><p class="text-lg font-semibold text-gray-800 mt-1">{items.length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">At or below reorder</p><p class="text-lg font-semibold {lowStock() > 0 ? 'text-red-600' : 'text-gray-800'} mt-1">{lowStock()}</p></div>
	</div>

	<div class="bg-white shadow">
		<div class="border-b border-gray-200 flex">
			<button onclick={() => (tab = 'stock')} class="px-4 py-3 text-xs border-b-2 {tab === 'stock' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Stock on hand</button>
			<button onclick={() => (tab = 'movements')} class="px-4 py-3 text-xs border-b-2 {tab === 'movements' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Movements</button>
			<button onclick={() => (tab = 'stores')} class="px-4 py-3 text-xs border-b-2 {tab === 'stores' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Stores</button>
		</div>

		<div class="p-6">
			{#if tab === 'stock'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Item</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Category</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">On hand</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Unit cost</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Value</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500"></th>
					</tr></thead>
					<tbody>
						{#each items as item}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{item.name}</p><p class="text-[10px] text-gray-400">{item.code}</p></td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{item.category ?? '—'}</td>
								<td class="px-3 py-2 text-right text-[11px] {Number(item.stock) <= Number(item.reorderLevel) ? 'text-red-600 font-semibold' : 'text-gray-700'}">{item.stock} {item.unit}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(item.unitCost)}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(Number(item.stock) * Number(item.unitCost))}</td>
								<td class="px-3 py-2 text-right"><button onclick={() => openMovement('Out', item)} class="text-[10px] text-[#114a4b] hover:underline">Issue</button></td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No inventory items yet. Add an item or receive a purchase order.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else if tab === 'movements'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Date</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Item</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Store</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Type</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Qty</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Value</th>
					</tr></thead>
					<tbody>
						{#each movements as movement}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(movement.movementDate)}</td>
								<td class="px-3 py-2 text-[11px] text-gray-700">{movement.item?.name}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{movement.warehouse?.name}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {movement.type === 'In' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">{movement.type}</span></td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{movement.quantity} {movement.item?.unit}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(Number(movement.quantity) * Number(movement.unitCost))}</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No stock movements yet.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="flex justify-end mb-3"><button onclick={() => (modal = 'store')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b]">New store</button></div>
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Store</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Location</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
					</tr></thead>
					<tbody>
						{#each warehouses as warehouse}
							<tr class="border-b border-gray-100"><td class="px-3 py-2 text-[11px] text-gray-800">{warehouse.name}</td><td class="px-3 py-2 text-[10px] text-gray-500">{warehouse.location ?? '—'}</td><td class="px-3 py-2 text-[10px] text-emerald-600">{warehouse.status}</td></tr>
						{:else}
							<tr><td colspan="3" class="px-3 py-8 text-center text-xs text-gray-500">No stores.</td></tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>

{#if modal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">{modal === 'item' ? 'New inventory item' : modal === 'movement' ? (movementForm.type === 'Out' ? 'Issue material' : 'Receive stock') : 'New store'}</h2>
				<button onclick={() => (modal = '')} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
			</div>

			{#if modal === 'item'}
				<form onsubmit={createItem} class="p-4 space-y-3">
					<div><label for="itemName" class="block text-[10px] font-medium text-gray-700 mb-1">Name *</label><input id="itemName" required bind:value={itemForm.name} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="itemCode" class="block text-[10px] font-medium text-gray-700 mb-1">Code</label><input id="itemCode" bind:value={itemForm.code} class="w-full px-3 py-2 border border-gray-300 text-xs" placeholder="Auto-generated" /></div>
						<div><label for="itemCategory" class="block text-[10px] font-medium text-gray-700 mb-1">Category</label><input id="itemCategory" bind:value={itemForm.category} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="itemUnit" class="block text-[10px] font-medium text-gray-700 mb-1">Unit</label><input id="itemUnit" bind:value={itemForm.unit} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="itemCost" class="block text-[10px] font-medium text-gray-700 mb-1">Unit cost (MWK)</label><input id="itemCost" type="number" min="0" bind:value={itemForm.unitCost} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="itemReorder" class="block text-[10px] font-medium text-gray-700 mb-1">Reorder level</label><input id="itemReorder" type="number" min="0" bind:value={itemForm.reorderLevel} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Add item</button></div>
				</form>
			{:else if modal === 'movement'}
				<form onsubmit={createMovement} class="p-4 space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div class="col-span-2"><label for="mvItem" class="block text-[10px] font-medium text-gray-700 mb-1">Item *</label><select id="mvItem" required bind:value={movementForm.itemId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Select item</option>{#each items as item}<option value={item.id}>{item.name} ({item.stock} {item.unit})</option>{/each}</select></div>
						<div><label for="mvWarehouse" class="block text-[10px] font-medium text-gray-700 mb-1">Store *</label><select id="mvWarehouse" required bind:value={movementForm.warehouseId} class="w-full px-3 py-2 border border-gray-300 text-xs">{#each warehouses as warehouse}<option value={warehouse.id}>{warehouse.name}</option>{/each}</select></div>
						<div><label for="mvDate" class="block text-[10px] font-medium text-gray-700 mb-1">Date</label><input id="mvDate" type="date" bind:value={movementForm.movementDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="mvQty" class="block text-[10px] font-medium text-gray-700 mb-1">Quantity *</label><input id="mvQty" type="number" min="0" step="0.01" required bind:value={movementForm.quantity} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="mvCost" class="block text-[10px] font-medium text-gray-700 mb-1">Unit cost (MWK)</label><input id="mvCost" type="number" min="0" bind:value={movementForm.unitCost} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="mvProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="mvProject" bind:value={movementForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.projectNumber} — {project.name}</option>{/each}</select></div>
						<div><label for="mvSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="mvSite" bind:value={movementForm.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
					</div>
					<div><label for="mvNotes" class="block text-[10px] font-medium text-gray-700 mb-1">Notes</label><input id="mvNotes" bind:value={movementForm.notes} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">{movementForm.type === 'Out' ? 'Issue' : 'Receive'}</button></div>
				</form>
			{:else}
				<form onsubmit={createWarehouse} class="p-4 space-y-3">
					<div><label for="whName" class="block text-[10px] font-medium text-gray-700 mb-1">Store name *</label><input id="whName" required bind:value={warehouseForm.name} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div><label for="whLocation" class="block text-[10px] font-medium text-gray-700 mb-1">Location</label><input id="whLocation" bind:value={warehouseForm.location} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Create store</button></div>
				</form>
			{/if}
		</div>
	</div>
{/if}
