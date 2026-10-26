<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import AttachmentField from '$lib/components/AttachmentField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const orders = $derived(data.orders as any[]);
	const suppliers = $derived(data.suppliers as any[]);

	onMount(async () => {
		const requestId = $page.url.searchParams.get('siteRequestId');
		if (!requestId) return;
		try {
			const response = await fetch(`/api/site-requests?id=${requestId}`);
			if (!response.ok) return;
			const request = await response.json();
			const site = (data.sites as any[]).find((item) => String(item.id) === String(request.siteId));
			poForm = {
				supplierId: '',
				projectId: site?.projectId ? String(site.projectId) : '',
				siteId: request.siteId ? String(request.siteId) : '',
				expectedDate: '',
				notes: `Converted from site request ${request.requestNumber}`,
				documentId: request.documentId ? String(request.documentId) : '',
				siteRequestId: String(request.id),
				items: (request.items ?? []).map((item: any) => ({
					description: item.description,
					unit: item.unit ?? '',
					quantity: Number(item.quantity) || 1,
					unitPrice: item.estimatedPrice ? Number(item.estimatedPrice) : ''
				}))
			};
			modal = 'order';
		} catch {
			// Keep the page usable if the request cannot be loaded.
		}
	});

	let tab = $state('orders');
	let modal = $state('');
	let submitting = $state(false);

	let poForm = $state({
		supplierId: '',
		projectId: '',
		siteId: '',
		expectedDate: '',
		notes: '',
		documentId: '',
		siteRequestId: '',
		items: [{ description: '', unit: '', quantity: 1, unitPrice: '' }]
	});

	let supplierForm = $state({ name: '', category: '', contactName: '', phone: '', email: '', taxId: '' });

	// Order detail / tracking
	let selectedOrder = $state<any>(null);
	let showDetail = $state(false);
	let timeline = $state<any[]>([]);
	let attachDocumentId = $state('');
	let grnDocumentId = $state('');
	let timelineLoading = $state(false);

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function formatMWK(value: number | string | null | undefined): string {
		const amount = Number(value ?? 0);
		if (amount >= 1_000_000_000) return `MWK ${(amount / 1_000_000_000).toFixed(2)}B`;
		if (amount >= 1_000_000) return `MWK ${(amount / 1_000_000).toFixed(1)}M`;
		if (amount >= 1_000) return `MWK ${(amount / 1_000).toFixed(0)}K`;
		return `MWK ${amount.toLocaleString()}`;
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function statusClass(status: string): string {
		if (status === 'Received') return 'bg-emerald-50 text-emerald-700';
		if (status === 'Ordered') return 'bg-blue-50 text-blue-700';
		if (status === 'Pending Approval') return 'bg-amber-50 text-amber-700';
		if (status === 'Rejected' || status === 'Cancelled') return 'bg-red-50 text-red-700';
		return 'bg-gray-100 text-gray-700';
	}

	async function openOrder(order: any) {
		selectedOrder = order;
		showDetail = true;
		attachDocumentId = order.documentId ? String(order.documentId) : '';
		grnDocumentId = order.grnDocumentId ? String(order.grnDocumentId) : '';
		await loadTimeline(order.id);
	}

	async function loadTimeline(orderId: string) {
		timelineLoading = true;
		try {
			const response = await fetch(`/api/activity?entityType=PurchaseOrder&entityId=${orderId}`);
			const result = await response.json();
			timeline = result.success ? result.data : [];
		} catch {
			timeline = [];
		} finally {
			timelineLoading = false;
		}
	}

	async function decideOrder(order: any, action: 'approve' | 'reject') {
		try {
			const response = await fetch('/api/approvals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entityType: 'PurchaseOrder', entityId: order.id, action })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success(action === 'approve' ? 'Purchase order approved' : 'Purchase order rejected');
			showDetail = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Approval failed');
		}
	}

	async function saveAttachment() {
		if (!selectedOrder) return;
		try {
			const response = await fetch('/api/procurement/orders', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: selectedOrder.id,
					action: 'attach',
					documentId: attachDocumentId || null
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			selectedOrder = { ...selectedOrder, documentId: attachDocumentId || null };
			toast.success('Supporting document updated');
			await invalidateAll();
			await loadTimeline(selectedOrder.id);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not attach document');
		}
	}

	function timelineIcon(action: string): string {
		switch (action) {
			case 'created':
				return 'mdi:file-plus-outline';
			case 'submitted':
				return 'mdi:send-clock-outline';
			case 'approved':
				return 'mdi:check-decagram';
			case 'rejected':
			case 'cancelled':
				return 'mdi:close-octagon-outline';
			case 'goods_received':
				return 'mdi:package-variant-closed-check';
			case 'document_attached':
				return 'mdi:paperclip';
			default:
				return 'mdi:circle-small';
		}
	}

	function addItem() {
		poForm.items = [...poForm.items, { description: '', unit: '', quantity: 1, unitPrice: '' }];
	}

	function removeItem(index: number) {
		poForm.items = poForm.items.filter((_, i) => i !== index);
	}

	function orderTotal(): number {
		return poForm.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
	}

	async function createOrder(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/procurement/orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					supplierId: poForm.supplierId,
					projectId: poForm.projectId || null,
					siteId: poForm.siteId || null,
					expectedDate: poForm.expectedDate || null,
					notes: poForm.notes,
					documentId: poForm.documentId || null,
					siteRequestId: poForm.siteRequestId || null,
					items: poForm.items.filter((item) => item.description.trim())
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Purchase order created');
			modal = '';
			poForm = { supplierId: '', projectId: '', siteId: '', expectedDate: '', notes: '', documentId: '', siteRequestId: '', items: [{ description: '', unit: '', quantity: 1, unitPrice: '' }] };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create purchase order');
		} finally {
			submitting = false;
		}
	}

	async function updateOrder(order: any, action: string) {
		try {
			const response = await fetch('/api/procurement/orders', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: order.id, action, grnDocumentId: action === 'receive' ? grnDocumentId || null : undefined })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			const messages: Record<string, string> = {
				order: 'Submitted for approval',
				receive: 'Goods received — stock, supplier bill and ledger updated',
				cancel: 'Purchase order cancelled'
			};
			toast.success(messages[action] ?? 'Purchase order updated');
			showDetail = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not update purchase order');
		}
	}

	async function createSupplier(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/procurement/suppliers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(supplierForm)
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Supplier added');
			modal = '';
			supplierForm = { name: '', category: '', contactName: '', phone: '', email: '', taxId: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not add supplier');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Procurement</h1>
			<p class="text-xs text-gray-500 mt-1">Purchase orders, suppliers and the goods-receipt hand-off into stores and payables.</p>
		</div>
		<div class="flex gap-2">
			<button onclick={() => (modal = 'supplier')} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">Add supplier</button>
			<button onclick={() => (modal = 'order')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">New purchase order</button>
		</div>
	</div>

	<div class="bg-white shadow">
		<div class="border-b border-gray-200 flex">
			<button onclick={() => (tab = 'orders')} class="px-4 py-3 text-xs border-b-2 {tab === 'orders' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Purchase orders</button>
			<button onclick={() => (tab = 'suppliers')} class="px-4 py-3 text-xs border-b-2 {tab === 'suppliers' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Suppliers</button>
		</div>

		<div class="p-6">
			{#if tab === 'orders'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Order</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Supplier</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project / Site</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Total</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Actions</th>
					</tr></thead>
					<tbody>
						{#each orders as order}
							<tr class="border-b border-gray-100 align-top">
								<td class="px-3 py-2">
									<button onclick={() => openOrder(order)} class="text-[11px] text-[#114a4b] hover:underline font-medium">{order.poNumber}</button>
									<p class="text-[10px] text-gray-400">{formatDate(order.orderDate)}</p>
								</td>
								<td class="px-3 py-2 text-[11px] text-gray-600">{order.supplier?.name}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">
									{(data.projects as any[]).find((project) => project.id === String(order.projectId))?.name ?? '—'}
									<br />{(data.sites as any[]).find((site) => site.id === String(order.siteId))?.name ?? ''}
								</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(order.total)}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(order.status)}">{order.status}</span></td>
								<td class="px-3 py-2 text-right space-x-2 whitespace-nowrap">
									<button onclick={() => openOrder(order)} class="text-[10px] text-gray-600 hover:underline">View</button>
									{#if order.status === 'Draft' || order.status === 'Rejected'}
										<button onclick={() => updateOrder(order, 'order')} class="text-[10px] text-[#114a4b] hover:underline">Submit</button>
									{/if}
									{#if order.status === 'Pending Approval'}
										<button onclick={() => decideOrder(order, 'approve')} class="text-[10px] text-emerald-700 hover:underline">Approve</button>
										<button onclick={() => decideOrder(order, 'reject')} class="text-[10px] text-red-600 hover:underline">Reject</button>
									{/if}
									{#if order.status === 'Ordered'}
										<button onclick={() => openOrder(order)} class="text-[10px] text-emerald-700 hover:underline">Receive goods</button>
									{/if}
									{#if order.status !== 'Received' && order.status !== 'Cancelled'}
										<button onclick={() => updateOrder(order, 'cancel')} class="text-[10px] text-red-600 hover:underline">Cancel</button>
									{/if}
								</td>
							</tr>
							<tr class="border-b border-gray-100 bg-gray-50/50">
								<td colspan="6" class="px-3 py-2">
									<div class="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-gray-500">
										{#each order.items as item}
											<span>{item.description} — {item.quantity} {item.unit ?? ''} @ {formatMWK(item.unitPrice)}</span>
										{/each}
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No purchase orders yet.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Supplier</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Category</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Contact</th>
						<th class="px-3 py-2 text-center text-[10px] uppercase text-gray-500">Orders</th>
						<th class="px-3 py-2 text-center text-[10px] uppercase text-gray-500">Bills</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
					</tr></thead>
					<tbody>
						{#each suppliers as supplier}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2 text-[11px] text-gray-800">{supplier.name}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{supplier.category ?? '—'}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{supplier.contactName ?? '—'}<br />{supplier.phone ?? ''}</td>
								<td class="px-3 py-2 text-center text-[11px] text-gray-700">{supplier._count?.purchaseOrders ?? 0}</td>
								<td class="px-3 py-2 text-center text-[11px] text-gray-700">{supplier._count?.bills ?? 0}</td>
								<td class="px-3 py-2 text-[10px] text-emerald-600">{supplier.status}</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No suppliers captured yet.</td></tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>

{#if modal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">{modal === 'order' ? 'New purchase order' : 'Add supplier'}</h2>
				<button onclick={() => (modal = '')} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
			</div>

			{#if modal === 'order'}
				<form onsubmit={createOrder} class="p-4 space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div><label for="poSupplier" class="block text-[10px] font-medium text-gray-700 mb-1">Supplier *</label><select id="poSupplier" required bind:value={poForm.supplierId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Select supplier</option>{#each suppliers as supplier}<option value={supplier.id}>{supplier.name}</option>{/each}</select></div>
						<div><label for="poExpected" class="block text-[10px] font-medium text-gray-700 mb-1">Expected delivery</label><input id="poExpected" type="date" bind:value={poForm.expectedDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="poProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="poProject" bind:value={poForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.projectNumber} — {project.name}</option>{/each}</select></div>
						<div><label for="poSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="poSite" bind:value={poForm.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
						<div class="col-span-2"><label for="poRequest" class="block text-[10px] font-medium text-gray-700 mb-1">Site material request</label><select id="poRequest" bind:value={poForm.siteRequestId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.siteRequests as request}<option value={request.id}>{request.requestNumber} — {request.requestType} (MWK {Number(request.estimatedTotal ?? 0).toLocaleString()})</option>{/each}</select></div>
					</div>

					<div class="border-t border-gray-200 pt-3">
						<div class="flex items-center justify-between mb-2"><p class="text-[10px] font-semibold text-gray-700">Order lines</p><button type="button" onclick={addItem} class="text-[10px] text-[#5fc5c0] hover:underline">+ Add line</button></div>
						{#each poForm.items as item, index}
							<div class="grid grid-cols-12 gap-2 mb-2">
								<input class="col-span-5 px-2 py-2 border border-gray-300 text-xs" placeholder="Description" bind:value={item.description} />
								<input class="col-span-2 px-2 py-2 border border-gray-300 text-xs" placeholder="Unit" bind:value={item.unit} />
								<input class="col-span-2 px-2 py-2 border border-gray-300 text-xs" type="number" min="0" step="0.5" placeholder="Qty" bind:value={item.quantity} />
								<input class="col-span-2 px-2 py-2 border border-gray-300 text-xs" type="number" min="0" placeholder="Unit price" bind:value={item.unitPrice} />
								<button type="button" onclick={() => removeItem(index)} class="col-span-1 text-gray-400 hover:text-red-600"><Icon icon="mdi:close" class="w-4 h-4 mx-auto" /></button>
							</div>
						{/each}
						<p class="text-right text-[11px] text-gray-700">Total: {formatMWK(orderTotal())}</p>
					</div>

					<div><label for="poNotes" class="block text-[10px] font-medium text-gray-700 mb-1">Notes</label><textarea id="poNotes" rows="2" bind:value={poForm.notes} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<AttachmentField bind:documentId={poForm.documentId} documents={data.documents} label="Supporting document (quotation, LPO, delivery note)" projectId={poForm.projectId} siteId={poForm.siteId} />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Create draft</button></div>
				</form>
			{:else}
				<form onsubmit={createSupplier} class="p-4 space-y-3">
					<div><label for="supName" class="block text-[10px] font-medium text-gray-700 mb-1">Name *</label><input id="supName" required bind:value={supplierForm.name} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="supCategory" class="block text-[10px] font-medium text-gray-700 mb-1">Category</label><input id="supCategory" bind:value={supplierForm.category} class="w-full px-3 py-2 border border-gray-300 text-xs" placeholder="Cement, plant hire…" /></div>
						<div><label for="supContact" class="block text-[10px] font-medium text-gray-700 mb-1">Contact person</label><input id="supContact" bind:value={supplierForm.contactName} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="supPhone" class="block text-[10px] font-medium text-gray-700 mb-1">Phone</label><input id="supPhone" bind:value={supplierForm.phone} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="supEmail" class="block text-[10px] font-medium text-gray-700 mb-1">Email</label><input id="supEmail" type="email" bind:value={supplierForm.email} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<div><label for="supTax" class="block text-[10px] font-medium text-gray-700 mb-1">Tax ID</label><input id="supTax" bind:value={supplierForm.taxId} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Add supplier</button></div>
				</form>
			{/if}
		</div>
	</div>
{/if}

{#if showDetail && selectedOrder}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-start justify-between p-4 border-b border-gray-200">
				<div>
					<p class="text-[10px] uppercase tracking-wide text-gray-500">Purchase order</p>
					<h2 class="text-sm font-bold text-gray-800">{selectedOrder.poNumber}</h2>
					<p class="text-[11px] text-gray-500">{selectedOrder.supplier?.name} · created {formatDateTime(selectedOrder.createdAt)}</p>
				</div>
				<div class="flex items-center gap-3">
					<span class="text-[10px] px-2 py-1 {statusClass(selectedOrder.status)}">{selectedOrder.status}</span>
					<button onclick={() => (showDetail = false)} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
				</div>
			</div>

			<div class="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 border-b border-gray-200">
				<div><p class="text-[10px] uppercase text-gray-500">Order date</p><p class="text-[11px] text-gray-800">{formatDate(selectedOrder.orderDate)}</p></div>
				<div><p class="text-[10px] uppercase text-gray-500">Expected</p><p class="text-[11px] text-gray-800">{formatDate(selectedOrder.expectedDate)}</p></div>
				<div><p class="text-[10px] uppercase text-gray-500">Project / Site</p><p class="text-[11px] text-gray-800">{(data.projects as any[]).find((p) => p.id === String(selectedOrder.projectId))?.name ?? '—'}</p><p class="text-[10px] text-gray-500">{(data.sites as any[]).find((s) => s.id === String(selectedOrder.siteId))?.name ?? ''}</p></div>
				<div><p class="text-[10px] uppercase text-gray-500">Total</p><p class="text-[11px] font-semibold text-gray-800">{formatMWK(selectedOrder.total)}</p></div>
			</div>

			<div class="p-4 border-b border-gray-200">
				<h3 class="text-[10px] uppercase text-gray-500 mb-2">Supporting document</h3>
				<div class="flex flex-wrap items-center gap-2">
					{#if selectedOrder.documentId}
						<a href={`/documents/${selectedOrder.documentId}`} class="text-[11px] text-[#114a4b] hover:underline">Open attached document</a>
					{:else}
						<span class="text-[11px] text-gray-500">No document attached.</span>
					{/if}
					<select bind:value={attachDocumentId} class="px-2 py-1.5 border border-gray-300 text-[11px] ml-auto">
						<option value="">No document</option>
						{#if attachDocumentId && !(data.documents as any[]).some((document) => String(document.id) === String(attachDocumentId))}
							<option value={attachDocumentId}>Attached document</option>
						{/if}
						{#each data.documents as document}
							<option value={String(document.id)}>{document.title}</option>
						{/each}
					</select>
					<label class="px-2 py-1.5 border border-gray-300 text-[11px] cursor-pointer hover:bg-gray-50">
						Upload from PC
						<input type="file" accept="image/*,application/pdf" class="hidden"
							onchange={async (event) => {
								const file = (event.currentTarget as HTMLInputElement).files?.[0];
								if (!file) return;
								try {
									const uploaded = await import('$lib/upload').then((m) => m.uploadEvidence(file, { title: file.name, projectId: selectedOrder?.projectId ? String(selectedOrder.projectId) : undefined }));
									attachDocumentId = uploaded.id;
									toast.success('File uploaded — save the attachment to link it');
								} catch (error) {
									toast.error(error instanceof Error ? error.message : 'Upload failed');
								}
							}} />
					</label>
					<button onclick={saveAttachment} class="px-3 py-1.5 bg-[#5fc5c0] text-white text-[11px] font-semibold hover:bg-[#114a4b]">Save attachment</button>
				</div>
				<div class="flex flex-wrap items-center gap-2 mt-3">
					<span class="text-[10px] uppercase text-gray-500">Goods received note (GRN)</span>
					{#if selectedOrder.grnDocumentId}
						<a href={`/documents/${selectedOrder.grnDocumentId}`} class="text-[11px] text-[#114a4b] hover:underline">Open signed delivery note</a>
					{:else}
						<span class="text-[11px] text-gray-500">Attach before receiving.</span>
					{/if}
					<AttachmentField bind:documentId={grnDocumentId} documents={data.documents} label="Goods received note (GRN) — signed delivery note" projectId={selectedOrder?.projectId ? String(selectedOrder.projectId) : ''} />
				</div>
			</div>

			<div class="p-4 border-b border-gray-200">
				<h3 class="text-[10px] uppercase text-gray-500 mb-2">Order lines</h3>
				<table class="w-full">
					<tbody>
						{#each selectedOrder.items as item}
							<tr class="border-b border-gray-100">
								<td class="py-1.5 text-[11px] text-gray-700">{item.description}</td>
								<td class="py-1.5 text-right text-[10px] text-gray-500">{item.quantity} {item.unit ?? ''}</td>
								<td class="py-1.5 text-right text-[11px] text-gray-700">{formatMWK(item.unitPrice)}</td>
								<td class="py-1.5 text-right text-[11px] text-gray-700">{formatMWK(item.amount)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="p-4">
				<h3 class="text-[10px] uppercase text-gray-500 mb-3">Tracking</h3>
				{#if timelineLoading}
					<p class="text-[11px] text-gray-500">Loading timeline…</p>
				{:else}
					<div class="space-y-3">
						{#each timeline as event}
							<div class="flex items-start gap-3">
								<div class="w-6 h-6 bg-[#e8f8f7] flex items-center justify-center flex-shrink-0">
									<Icon icon={timelineIcon(event.action)} class="w-3.5 h-3.5 text-[#114a4b]" />
								</div>
								<div class="flex-1">
									<p class="text-[11px] text-gray-800">{event.description}</p>
									<p class="text-[10px] text-gray-400">{formatDateTime(event.createdAt)}</p>
								</div>
							</div>
						{:else}
							<p class="text-[11px] text-gray-500">No tracking events recorded yet.</p>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex flex-wrap justify-end gap-2 p-4 border-t border-gray-200">
				{#if selectedOrder.status === 'Draft' || selectedOrder.status === 'Rejected'}
					<button onclick={() => updateOrder(selectedOrder, 'order')} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b]">Submit for approval</button>
				{/if}
				{#if selectedOrder.status === 'Pending Approval'}
					<button onclick={() => decideOrder(selectedOrder, 'approve')} class="px-3 py-2 text-xs bg-emerald-600 text-white font-semibold hover:bg-emerald-700">Approve</button>
					<button onclick={() => decideOrder(selectedOrder, 'reject')} class="px-3 py-2 text-xs border border-red-300 text-red-600 hover:bg-red-50">Reject</button>
				{/if}
				{#if selectedOrder.status === 'Ordered'}
					<button onclick={() => updateOrder(selectedOrder, 'receive')} class="px-3 py-2 text-xs bg-emerald-600 text-white font-semibold hover:bg-emerald-700">Receive goods</button>
				{/if}
				{#if selectedOrder.status !== 'Received' && selectedOrder.status !== 'Cancelled'}
					<button onclick={() => updateOrder(selectedOrder, 'cancel')} class="px-3 py-2 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
				{/if}
				<button onclick={() => (showDetail = false)} class="px-3 py-2 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
			</div>
		</div>
	</div>
{/if}
