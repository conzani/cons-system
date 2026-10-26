<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import AttachmentField from '$lib/components/AttachmentField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const rfis = $derived(data.rfis as any[]);
	const drawings = $derived(data.drawings as any[]);

	let tab = $state('rfis');
	let modal = $state('');
	let submitting = $state(false);
	let answering = $state<any>(null);
	let answer = $state('');

	let form = $state({ projectId: '', siteId: '', subject: '', question: '', raisedBy: '', assignedTo: '', dueDate: '', documentId: '' });

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function statusClass(status: string): string {
		if (status === 'Answered' || status === 'Closed') return 'bg-emerald-50 text-emerald-700';
		return 'bg-amber-50 text-amber-700';
	}

	async function createRfi(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/engineering/rfis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...form, projectId: form.projectId || null, siteId: form.siteId || null, dueDate: form.dueDate || null })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('RFI raised');
			modal = '';
			form = { projectId: '', siteId: '', subject: '', question: '', raisedBy: '', assignedTo: '', dueDate: '', documentId: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not raise RFI');
		} finally {
			submitting = false;
		}
	}

	function openAnswer(rfi: any) {
		answering = rfi;
		answer = rfi.response ?? '';
		modal = 'answer';
	}

	async function submitAnswer(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/engineering/rfis', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: answering.id, response: answer, status: 'Answered' })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('RFI answered');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not answer RFI');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Engineering</h1>
			<p class="text-xs text-gray-500 mt-1">Drawing register and Requests for Information raised from site.</p>
		</div>
		<button onclick={() => (modal = 'rfi')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">Raise RFI</button>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Drawings</p><p class="text-lg font-semibold text-gray-800 mt-1">{drawings.length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Open RFIs</p><p class="text-lg font-semibold text-amber-600 mt-1">{rfis.filter((item) => item.status === 'Open').length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Answered</p><p class="text-lg font-semibold text-emerald-600 mt-1">{rfis.filter((item) => item.status === 'Answered').length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Overdue RFIs</p><p class="text-lg font-semibold text-red-600 mt-1">{rfis.filter((item) => item.status === 'Open' && item.dueDate && new Date(item.dueDate) < new Date()).length}</p></div>
	</div>

	<div class="bg-white shadow">
		<div class="border-b border-gray-200 flex">
			<button onclick={() => (tab = 'rfis')} class="px-4 py-3 text-xs border-b-2 {tab === 'rfis' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">RFIs</button>
			<button onclick={() => (tab = 'drawings')} class="px-4 py-3 text-xs border-b-2 {tab === 'drawings' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Drawing register</button>
		</div>
		<div class="p-6">
			{#if tab === 'rfis'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">RFI</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Raised / Due</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500"></th>
					</tr></thead>
					<tbody>
						{#each rfis as rfi}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{rfi.rfiNumber}</p><p class="text-[10px] text-gray-400">{rfi.subject}</p>{#if rfi.documentId}<a href={`/documents/${rfi.documentId}`} class="text-[9px] text-[#5fc5c0] hover:underline">Attachment</a>{/if}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{(data.projects as any[]).find((project) => project.id === String(rfi.projectId))?.name ?? '—'}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(rfi.raisedDate)}<br />{formatDate(rfi.dueDate)}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(rfi.status)}">{rfi.status}</span></td>
								<td class="px-3 py-2 text-right"><button onclick={() => openAnswer(rfi)} class="text-[10px] text-[#114a4b] hover:underline">{rfi.response ? 'View / update' : 'Answer'}</button></td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-3 py-8 text-center text-xs text-gray-500">No RFIs raised.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Drawing</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Type</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Revision</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500"></th>
					</tr></thead>
					<tbody>
						{#each drawings as drawing}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{drawing.title}</p><p class="text-[10px] text-gray-400">{drawing.fileName}</p></td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{drawing.documentType?.name ?? drawing.fileExtension.toUpperCase()}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{drawing.project?.name ?? '—'}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{drawing.revisionNumber ?? '—'}</td>
								<td class="px-3 py-2 text-right"><a href={`/documents/${drawing.id}`} class="text-[10px] text-[#114a4b] hover:underline">Open</a></td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-3 py-8 text-center text-xs text-gray-500">No drawings in the register. Upload drawing-type documents in the document library.</td></tr>
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
			<div class="flex items-center justify-between p-4 border-b border-gray-200"><h2 class="text-sm font-bold text-gray-800">{modal === 'rfi' ? 'Raise RFI' : 'RFI answer'}</h2><button onclick={() => (modal = '')} class="text-gray-500"><Icon icon="mdi:close" class="w-5 h-5" /></button></div>
			{#if modal === 'rfi'}
				<form onsubmit={createRfi} class="p-4 space-y-3">
					<div><label for="rfiSubject" class="block text-[10px] font-medium text-gray-700 mb-1">Subject *</label><input id="rfiSubject" required bind:value={form.subject} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="rfiProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="rfiProject" bind:value={form.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></div>
						<div><label for="rfiSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="rfiSite" bind:value={form.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
						<div><label for="rfiRaisedBy" class="block text-[10px] font-medium text-gray-700 mb-1">Raised by</label><input id="rfiRaisedBy" bind:value={form.raisedBy} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="rfiAssigned" class="block text-[10px] font-medium text-gray-700 mb-1">Assigned to</label><input id="rfiAssigned" bind:value={form.assignedTo} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="rfiDue" class="block text-[10px] font-medium text-gray-700 mb-1">Response due</label><input id="rfiDue" type="date" bind:value={form.dueDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<div><label for="rfiQuestion" class="block text-[10px] font-medium text-gray-700 mb-1">Question *</label><textarea id="rfiQuestion" rows="3" required bind:value={form.question} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<AttachmentField bind:documentId={form.documentId} documents={data.documents} label="Supporting drawing / photo / evidence" projectId={form.projectId} siteId={form.siteId} />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Raise RFI</button></div>
				</form>
			{:else}
				<form onsubmit={submitAnswer} class="p-4 space-y-3">
					<div class="bg-gray-50 p-3"><p class="text-[10px] uppercase text-gray-500">{answering?.rfiNumber}</p><p class="text-[11px] font-medium text-gray-800 mt-1">{answering?.subject}</p><p class="text-[11px] text-gray-600 mt-2">{answering?.question}</p></div>
					<div><label for="rfiAnswer" class="block text-[10px] font-medium text-gray-700 mb-1">Response *</label><textarea id="rfiAnswer" rows="4" required bind:value={answer} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Save answer</button></div>
				</form>
			{/if}
		</div>
	</div>
{/if}
