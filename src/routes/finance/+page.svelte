<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import AttachmentField from '$lib/components/AttachmentField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const summary = $derived(data.summary as any);
	const invoices = $derived(data.invoices as any[]);
	const bills = $derived(data.bills as any[]);
	const accounts = $derived(data.accounts as any[]);
	const entries = $derived(summary.entries as any[]);

	let tab = $state('overview');
	let modal = $state('');
	let submitting = $state(false);
	let paymentTarget = $state<any>(null);

	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'receivables', label: 'Receivables' },
		{ id: 'payables', label: 'Payables' },
		{ id: 'journal', label: 'Journal' },
		{ id: 'accounts', label: 'Chart of Accounts' }
	];

	let invoiceForm = $state({ client: '', projectId: '', issueDate: today(), dueDate: '', subtotal: '', taxAmount: '', description: '', status: 'Sent', documentId: '' });
	let billForm = $state({ supplierId: '', supplierName: '', projectId: '', billDate: today(), dueDate: '', subtotal: '', taxAmount: '', description: '', documentId: '' });
	let paymentForm = $state({ amount: '', method: 'Bank Transfer', reference: '', paymentDate: today(), documentId: '' });
	let accountForm = $state({ code: '', name: '', type: 'Expense', description: '' });
	let journalForm = $state({ description: '', entryDate: today(), lines: [{ accountCode: '', debit: '', credit: '' }, { accountCode: '', debit: '', credit: '' }] });

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function formatMWK(value: number | string | null | undefined): string {
		const amount = Number(value ?? 0);
		const sign = amount < 0 ? '-' : '';
		const abs = Math.abs(amount);
		if (abs >= 1_000_000_000) return `${sign}MWK ${(abs / 1_000_000_000).toFixed(2)}B`;
		if (abs >= 1_000_000) return `${sign}MWK ${(abs / 1_000_000).toFixed(1)}M`;
		if (abs >= 1_000) return `${sign}MWK ${(abs / 1_000).toFixed(0)}K`;
		return `${sign}MWK ${abs.toLocaleString()}`;
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function statusClass(status: string): string {
		if (['Paid', 'Pass', 'Approved', 'Sent'].includes(status)) return 'bg-emerald-50 text-emerald-700';
		if (['PartPaid', 'Pending', 'Draft', 'Pending Approval'].includes(status)) return 'bg-amber-50 text-amber-700';
		if (['Overdue', 'Cancelled', 'Fail', 'Rejected'].includes(status)) return 'bg-red-50 text-red-700';
		return 'bg-gray-100 text-gray-700';
	}

	function proofDocumentId(type: 'invoice' | 'bill', id: string): string | null {
		const payment = (data.payments as any[]).find((item) =>
			type === 'invoice' ? item.invoiceId === String(id) : item.billId === String(id)
		);
		return payment?.documentId ?? null;
	}

	async function decide(entityType: string, entityId: string, action: 'approve' | 'reject') {
		try {
			const response = await fetch('/api/approvals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ entityType, entityId, action })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success(action === 'approve' ? 'Approved and posted' : 'Rejected');
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Approval failed');
		}
	}

	function openPayment(type: 'invoice' | 'bill', item: any) {
		paymentTarget = { type, id: item.id, max: Number(item.total) - Number(item.paidAmount), label: type === 'invoice' ? item.invoiceNumber : item.billNumber };
		paymentForm = { amount: String(Number(item.total) - Number(item.paidAmount)), method: 'Bank Transfer', reference: '', paymentDate: today(), documentId: '' };
		modal = 'payment';
	}

	async function submitInvoice(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/finance/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...invoiceForm,
					projectId: invoiceForm.projectId || null,
					dueDate: invoiceForm.dueDate || null
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Invoice submitted for approval');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create invoice');
		} finally {
			submitting = false;
		}
	}

	async function submitBill(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/finance/bills', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...billForm,
					projectId: billForm.projectId || null,
					dueDate: billForm.dueDate || null
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Supplier bill submitted for approval');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create bill');
		} finally {
			submitting = false;
		}
	}

	async function submitPayment(event: Event) {
		event.preventDefault();
		if (!paymentTarget) return;
		submitting = true;
		try {
			const endpoint = paymentTarget.type === 'invoice' ? '/api/finance/invoices' : '/api/finance/bills';
			const response = await fetch(endpoint, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: paymentTarget.id, action: 'payment', ...paymentForm })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success(paymentTarget.type === 'invoice' ? 'Receipt recorded' : 'Supplier payment recorded');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not record payment');
		} finally {
			submitting = false;
		}
	}

	async function submitAccount(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/finance/accounts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(accountForm)
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Account created');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create account');
		} finally {
			submitting = false;
		}
	}

	function addJournalLine() {
		journalForm.lines = [...journalForm.lines, { accountCode: '', debit: '', credit: '' }];
	}

	async function submitJournal(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/finance/journal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: journalForm.description,
					entryDate: journalForm.entryDate,
					lines: journalForm.lines.map((line) => ({
						accountCode: line.accountCode,
						debit: Number(line.debit) || 0,
						credit: Number(line.credit) || 0
					}))
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Journal posted');
			modal = '';
			journalForm = { description: '', entryDate: today(), lines: [{ accountCode: '', debit: '', credit: '' }, { accountCode: '', debit: '', credit: '' }] };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not post journal');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Finance</h1>
			<p class="text-xs text-gray-500 mt-1">Contract revenue, supplier costs, payroll postings and the general ledger.</p>
		</div>
		<div class="flex gap-2">
			<button onclick={() => (modal = 'journal')} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">Post journal</button>
			<button onclick={() => (modal = 'invoice')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">New invoice</button>
			<button onclick={() => (modal = 'bill')} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">New supplier bill</button>
		</div>
	</div>

	<div class="bg-white shadow">
		<div class="border-b border-gray-200 flex overflow-x-auto">
			{#each tabs as item}
				<button onclick={() => (tab = item.id)} class="px-4 py-3 text-xs whitespace-nowrap border-b-2 {tab === item.id ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">{item.label}</button>
			{/each}
		</div>

		<div class="p-6">
			{#if tab === 'overview'}
				<div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
					<div class="bg-gray-50 p-4"><p class="text-[10px] uppercase text-gray-500">Cash and bank</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(summary.cash)}</p></div>
					<div class="bg-gray-50 p-4"><p class="text-[10px] uppercase text-gray-500">Receivables</p><p class="text-lg font-semibold text-amber-600 mt-1">{formatMWK(summary.receivable)}</p></div>
					<div class="bg-gray-50 p-4"><p class="text-[10px] uppercase text-gray-500">Payables</p><p class="text-lg font-semibold text-red-600 mt-1">{formatMWK(summary.payable)}</p></div>
					<div class="bg-gray-50 p-4"><p class="text-[10px] uppercase text-gray-500">Revenue posted</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(summary.totalRevenue)}</p></div>
					<div class="bg-gray-50 p-4"><p class="text-[10px] uppercase text-gray-500">Costs posted</p><p class="text-lg font-semibold text-gray-800 mt-1">{formatMWK(summary.totalExpenses)}</p></div>
					<div class="bg-gray-50 p-4"><p class="text-[10px] uppercase text-gray-500">Gross profit</p><p class="text-lg font-semibold {summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">{formatMWK(summary.profit)}</p></div>
				</div>

				<h3 class="text-xs font-semibold text-gray-700 mb-3">Recent ledger activity</h3>
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Entry</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Description</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Source</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Amount</th>
					</tr></thead>
					<tbody>
						{#each entries as entry}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2 text-[11px] text-gray-700">{entry.entryNumber}<br /><span class="text-[10px] text-gray-400">{formatDate(entry.entryDate)}</span></td>
								<td class="px-3 py-2 text-[11px] text-gray-700">{entry.description}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{entry.sourceType}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(entry.lines.reduce((sum: number, line: any) => sum + Number(line.debit), 0))}</td>
							</tr>
						{:else}
							<tr><td colspan="4" class="px-3 py-8 text-center text-xs text-gray-500">No ledger activity yet. Approve payroll, raise an invoice or receive a purchase order.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else if tab === 'receivables'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Invoice</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Client</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Issued / Due</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Total</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Outstanding</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500"></th>
					</tr></thead>
					<tbody>
						{#each invoices as invoice}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2 text-[11px] text-gray-800">
									{invoice.invoiceNumber}
									{#if invoice.documentId}
										<a href={`/documents/${invoice.documentId}`} class="block text-[9px] text-[#5fc5c0] hover:underline">Supporting document</a>
									{/if}
									{#if proofDocumentId('invoice', invoice.id)}
										<a href={`/documents/${proofDocumentId('invoice', invoice.id)}`} class="block text-[9px] text-emerald-600 hover:underline">Payment proof</a>
									{/if}
								</td>
								<td class="px-3 py-2 text-[11px] text-gray-600">{invoice.client}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(invoice.issueDate)}<br />{formatDate(invoice.dueDate)}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(invoice.total)}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(Number(invoice.total) - Number(invoice.paidAmount))}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(invoice.status)}">{invoice.status}</span></td>
								<td class="px-3 py-2 text-right">
									{#if invoice.status === 'Pending Approval'}
										<button onclick={() => decide('Invoice', invoice.id, 'approve')} class="text-[10px] text-emerald-700 hover:underline mr-2">Approve</button>
										<button onclick={() => decide('Invoice', invoice.id, 'reject')} class="text-[10px] text-red-600 hover:underline">Reject</button>
									{:else if Number(invoice.paidAmount) < Number(invoice.total) && invoice.status !== 'Cancelled' && invoice.status !== 'Rejected'}
										<button onclick={() => openPayment('invoice', invoice)} class="text-[10px] text-[#114a4b] hover:underline">Record receipt</button>
									{/if}
								</td>
							</tr>
						{:else}
							<tr><td colspan="7" class="px-3 py-8 text-center text-xs text-gray-500">No invoices yet.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else if tab === 'payables'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Bill</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Supplier</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Date</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Total</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Outstanding</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500"></th>
					</tr></thead>
					<tbody>
						{#each bills as bill}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2 text-[11px] text-gray-800">
									{bill.billNumber}
									{#if bill.documentId}
										<a href={`/documents/${bill.documentId}`} class="block text-[9px] text-[#5fc5c0] hover:underline">Supporting document</a>
									{/if}
									{#if proofDocumentId('bill', bill.id)}
										<a href={`/documents/${proofDocumentId('bill', bill.id)}`} class="block text-[9px] text-emerald-600 hover:underline">Payment proof</a>
									{/if}
								</td>
								<td class="px-3 py-2 text-[11px] text-gray-600">{bill.supplier?.name ?? bill.supplierName}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(bill.billDate)}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(bill.total)}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(Number(bill.total) - Number(bill.paidAmount))}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(bill.status)}">{bill.status}</span></td>
								<td class="px-3 py-2 text-right">
									{#if bill.status === 'Pending Approval'}
										<button onclick={() => decide('Bill', bill.id, 'approve')} class="text-[10px] text-emerald-700 hover:underline mr-2">Approve</button>
										<button onclick={() => decide('Bill', bill.id, 'reject')} class="text-[10px] text-red-600 hover:underline">Reject</button>
									{:else if Number(bill.paidAmount) < Number(bill.total) && bill.status !== 'Cancelled' && bill.status !== 'Rejected'}
										<button onclick={() => openPayment('bill', bill)} class="text-[10px] text-[#114a4b] hover:underline">Pay supplier</button>
									{/if}
								</td>
							</tr>
						{:else}
							<tr><td colspan="7" class="px-3 py-8 text-center text-xs text-gray-500">No supplier bills yet.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else if tab === 'journal'}
				<div class="space-y-4">
					{#each entries as entry}
						<div class="border border-gray-200">
							<div class="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-3 py-2">
								<div><span class="text-[11px] font-semibold text-gray-800">{entry.entryNumber}</span><span class="text-[10px] text-gray-500 ml-2">{entry.description}</span></div>
								<div class="text-[10px] text-gray-500">{formatDate(entry.entryDate)} · {entry.sourceType}</div>
							</div>
							<table class="w-full">
								<tbody>
									{#each entry.lines as line}
										<tr class="border-b border-gray-100">
											<td class="px-3 py-1.5 text-[11px] text-gray-700">{line.account.code} — {line.account.name}</td>
											<td class="px-3 py-1.5 text-[10px] text-gray-500">{line.description ?? ''}</td>
											<td class="px-3 py-1.5 text-right text-[11px] text-gray-700">{Number(line.debit) ? formatMWK(line.debit) : ''}</td>
											<td class="px-3 py-1.5 text-right text-[11px] text-gray-700">{Number(line.credit) ? formatMWK(line.credit) : ''}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-xs text-gray-500">No journal entries.</p>
					{/each}
				</div>
			{:else if tab === 'accounts'}
				<div class="flex justify-end mb-3">
					<button onclick={() => (modal = 'account')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b]">Add account</button>
				</div>
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Code</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Account</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Type</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Balance</th>
					</tr></thead>
					<tbody>
						{#each accounts as account}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2 text-[11px] text-gray-700">{account.code}</td>
								<td class="px-3 py-2 text-[11px] text-gray-700">{account.name}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{account.type}</td>
								<td class="px-3 py-2 text-right text-[11px] text-gray-700">{formatMWK(account.balance)}</td>
							</tr>
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
				<h2 class="text-sm font-bold text-gray-800">
					{modal === 'invoice' ? 'New invoice' : modal === 'bill' ? 'New supplier bill' : modal === 'payment' ? 'Record payment' : modal === 'account' ? 'Add account' : 'Post journal entry'}
				</h2>
				<button onclick={() => (modal = '')} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
			</div>

			{#if modal === 'invoice'}
				<form onsubmit={submitInvoice} class="p-4 space-y-3">
					<div><label for="invClient" class="block text-[10px] font-medium text-gray-700 mb-1">Client *</label><input id="invClient" required bind:value={invoiceForm.client} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="invProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="invProject" bind:value={invoiceForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.projectNumber} — {project.name}</option>{/each}</select></div>
						<div><label for="invDate" class="block text-[10px] font-medium text-gray-700 mb-1">Issue date</label><input id="invDate" type="date" bind:value={invoiceForm.issueDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="invSubtotal" class="block text-[10px] font-medium text-gray-700 mb-1">Amount (MWK) *</label><input id="invSubtotal" type="number" min="0" required bind:value={invoiceForm.subtotal} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="invTax" class="block text-[10px] font-medium text-gray-700 mb-1">Tax (MWK)</label><input id="invTax" type="number" min="0" bind:value={invoiceForm.taxAmount} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<div><label for="invDesc" class="block text-[10px] font-medium text-gray-700 mb-1">Description</label><textarea id="invDesc" rows="2" bind:value={invoiceForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<AttachmentField bind:documentId={invoiceForm.documentId} documents={data.documents} label="Supporting document" projectId={invoiceForm.projectId} />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Issue invoice</button></div>
				</form>
			{:else if modal === 'bill'}
				<form onsubmit={submitBill} class="p-4 space-y-3">
					<div><label for="billSupplier" class="block text-[10px] font-medium text-gray-700 mb-1">Supplier name *</label><input id="billSupplier" required bind:value={billForm.supplierName} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="billProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="billProject" bind:value={billForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.projectNumber} — {project.name}</option>{/each}</select></div>
						<div><label for="billDate" class="block text-[10px] font-medium text-gray-700 mb-1">Bill date</label><input id="billDate" type="date" bind:value={billForm.billDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="billSubtotal" class="block text-[10px] font-medium text-gray-700 mb-1">Amount (MWK) *</label><input id="billSubtotal" type="number" min="0" required bind:value={billForm.subtotal} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="billTax" class="block text-[10px] font-medium text-gray-700 mb-1">Tax (MWK)</label><input id="billTax" type="number" min="0" bind:value={billForm.taxAmount} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<div><label for="billDesc" class="block text-[10px] font-medium text-gray-700 mb-1">Description</label><textarea id="billDesc" rows="2" bind:value={billForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<AttachmentField bind:documentId={billForm.documentId} documents={data.documents} label="Supporting document" projectId={billForm.projectId} />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Record bill</button></div>
				</form>
			{:else if modal === 'payment'}
				<form onsubmit={submitPayment} class="p-4 space-y-3">
					<p class="text-[11px] text-gray-600">{paymentTarget?.label} — outstanding {formatMWK(paymentTarget?.max)}</p>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="payAmount" class="block text-[10px] font-medium text-gray-700 mb-1">Amount (MWK) *</label><input id="payAmount" type="number" min="1" max={paymentTarget?.max} required bind:value={paymentForm.amount} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="payDate" class="block text-[10px] font-medium text-gray-700 mb-1">Date</label><input id="payDate" type="date" bind:value={paymentForm.paymentDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="payMethod" class="block text-[10px] font-medium text-gray-700 mb-1">Method</label><select id="payMethod" bind:value={paymentForm.method} class="w-full px-3 py-2 border border-gray-300 text-xs"><option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>Mobile Money</option></select></div>
						<div><label for="payRef" class="block text-[10px] font-medium text-gray-700 mb-1">Reference</label><input id="payRef" bind:value={paymentForm.reference} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<AttachmentField bind:documentId={paymentForm.documentId} documents={data.documents} label="Proof of payment / bank slip" />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Record</button></div>
				</form>
			{:else if modal === 'account'}
				<form onsubmit={submitAccount} class="p-4 space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div><label for="accCode" class="block text-[10px] font-medium text-gray-700 mb-1">Code *</label><input id="accCode" required bind:value={accountForm.code} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="accType" class="block text-[10px] font-medium text-gray-700 mb-1">Type</label><select id="accType" bind:value={accountForm.type} class="w-full px-3 py-2 border border-gray-300 text-xs">{#each ['Asset','Liability','Equity','Revenue','Expense'] as type}<option value={type}>{type}</option>{/each}</select></div>
					</div>
					<div><label for="accName" class="block text-[10px] font-medium text-gray-700 mb-1">Name *</label><input id="accName" required bind:value={accountForm.name} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div><label for="accDesc" class="block text-[10px] font-medium text-gray-700 mb-1">Description</label><input id="accDesc" bind:value={accountForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Create</button></div>
				</form>
			{:else if modal === 'journal'}
				<form onsubmit={submitJournal} class="p-4 space-y-3">
					<div><label for="jeDesc" class="block text-[10px] font-medium text-gray-700 mb-1">Description *</label><input id="jeDesc" required bind:value={journalForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div><label for="jeDate" class="block text-[10px] font-medium text-gray-700 mb-1">Date</label><input id="jeDate" type="date" bind:value={journalForm.entryDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					{#each journalForm.lines as line, index}
						<div class="grid grid-cols-3 gap-2 items-end">
							<div><label for={`jeAccount${index}`} class="block text-[10px] font-medium text-gray-700 mb-1">Account</label><select id={`jeAccount${index}`} bind:value={line.accountCode} class="w-full px-2 py-2 border border-gray-300 text-xs"><option value="">Select</option>{#each accounts as account}<option value={account.code}>{account.code} — {account.name}</option>{/each}</select></div>
							<div><label for={`jeDebit${index}`} class="block text-[10px] font-medium text-gray-700 mb-1">Debit</label><input id={`jeDebit${index}`} type="number" min="0" bind:value={line.debit} class="w-full px-2 py-2 border border-gray-300 text-xs" /></div>
							<div><label for={`jeCredit${index}`} class="block text-[10px] font-medium text-gray-700 mb-1">Credit</label><input id={`jeCredit${index}`} type="number" min="0" bind:value={line.credit} class="w-full px-2 py-2 border border-gray-300 text-xs" /></div>
						</div>
					{/each}
					<button type="button" onclick={addJournalLine} class="text-[10px] text-[#5fc5c0] hover:underline">+ Add line</button>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Post</button></div>
				</form>
			{/if}
		</div>
	</div>
{/if}
