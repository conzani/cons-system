<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import AttachmentField from '$lib/components/AttachmentField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const inspections = $derived(data.inspections as any[]);
	const ncrs = $derived(data.ncrs as any[]);

	let tab = $state('inspections');
	let modal = $state('');
	let submitting = $state(false);

	let inspectionForm = $state({ projectId: '', siteId: '', type: 'Site', inspectionDate: today(), inspectorName: '', status: 'Pending', findings: '', documentId: '' });
	let ncrForm = $state({ projectId: '', siteId: '', title: '', description: '', severity: 'Medium', dueDate: '', correctiveAction: '', documentId: '' });

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function statusClass(status: string): string {
		if (['Pass', 'Closed'].includes(status)) return 'bg-emerald-50 text-emerald-700';
		if (['Pending', 'Open', 'Under Review'].includes(status)) return 'bg-amber-50 text-amber-700';
		if (['Fail'].includes(status)) return 'bg-red-50 text-red-700';
		return 'bg-gray-100 text-gray-700';
	}

	function severityClass(severity: string): string {
		if (severity === 'Critical') return 'bg-red-100 text-red-700';
		if (severity === 'High') return 'bg-orange-50 text-orange-700';
		if (severity === 'Medium') return 'bg-amber-50 text-amber-700';
		return 'bg-gray-100 text-gray-700';
	}

	async function createInspection(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/quality/inspections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...inspectionForm, projectId: inspectionForm.projectId || null, siteId: inspectionForm.siteId || null })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Inspection recorded');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not record inspection');
		} finally {
			submitting = false;
		}
	}

	async function createNcr(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/quality/ncrs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...ncrForm, projectId: ncrForm.projectId || null, siteId: ncrForm.siteId || null, dueDate: ncrForm.dueDate || null })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('NCR raised');
			modal = '';
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not raise NCR');
		} finally {
			submitting = false;
		}
	}

	async function setInspectionStatus(inspection: any, status: string) {
		try {
			const response = await fetch('/api/quality/inspections', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: inspection.id, status })
			});
			if (!response.ok) throw new Error();
			await invalidateAll();
		} catch {
			toast.error('Could not update inspection');
		}
	}

	async function setNcrStatus(ncr: any, status: string) {
		try {
			const response = await fetch('/api/quality/ncrs', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: ncr.id, status })
			});
			if (!response.ok) throw new Error();
			await invalidateAll();
		} catch {
			toast.error('Could not update NCR');
		}
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Quality Management</h1>
			<p class="text-xs text-gray-500 mt-1">Inspections, non-conformance reports and close-out tracking across projects and sites.</p>
		</div>
		<div class="flex gap-2">
			<button onclick={() => (modal = 'inspection')} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">New inspection</button>
			<button onclick={() => (modal = 'ncr')} class="px-3 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50">Raise NCR</button>
		</div>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Inspections</p><p class="text-lg font-semibold text-gray-800 mt-1">{inspections.length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Failed</p><p class="text-lg font-semibold text-red-600 mt-1">{inspections.filter((item) => item.status === 'Fail').length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Open NCRs</p><p class="text-lg font-semibold text-amber-600 mt-1">{ncrs.filter((item) => item.status !== 'Closed').length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Critical NCRs</p><p class="text-lg font-semibold text-red-600 mt-1">{ncrs.filter((item) => item.severity === 'Critical' && item.status !== 'Closed').length}</p></div>
	</div>

	<div class="bg-white shadow">
		<div class="border-b border-gray-200 flex">
			<button onclick={() => (tab = 'inspections')} class="px-4 py-3 text-xs border-b-2 {tab === 'inspections' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Inspections</button>
			<button onclick={() => (tab = 'ncrs')} class="px-4 py-3 text-xs border-b-2 {tab === 'ncrs' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600'}">Non-conformances</button>
		</div>

		<div class="p-6">
			{#if tab === 'inspections'}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Inspection</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project / Site</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Date</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Actions</th>
					</tr></thead>
					<tbody>
						{#each inspections as inspection}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{inspection.inspectionNumber}</p><p class="text-[10px] text-gray-400">{inspection.type} · {inspection.inspectorName ?? 'Inspector'}</p>{#if inspection.documentId}<a href={`/documents/${inspection.documentId}`} class="text-[9px] text-[#5fc5c0] hover:underline">Evidence</a>{/if}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{(data.projects as any[]).find((project) => project.id === String(inspection.projectId))?.name ?? '—'}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(inspection.inspectionDate)}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(inspection.status)}">{inspection.status}</span></td>
								<td class="px-3 py-2 text-right space-x-2">
									{#if inspection.status !== 'Pass'}<button onclick={() => setInspectionStatus(inspection, 'Pass')} class="text-[10px] text-emerald-700 hover:underline">Pass</button>{/if}
									{#if inspection.status !== 'Fail'}<button onclick={() => setInspectionStatus(inspection, 'Fail')} class="text-[10px] text-red-600 hover:underline">Fail</button>{/if}
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-3 py-8 text-center text-xs text-gray-500">No inspections recorded.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200"><tr>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">NCR</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Severity</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Raised / Due</th>
						<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
						<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Actions</th>
					</tr></thead>
					<tbody>
						{#each ncrs as ncr}
							<tr class="border-b border-gray-100">
								<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{ncr.ncrNumber}</p><p class="text-[10px] text-gray-400">{ncr.title}</p>{#if ncr.documentId}<a href={`/documents/${ncr.documentId}`} class="text-[9px] text-[#5fc5c0] hover:underline">Evidence</a>{/if}</td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{(data.projects as any[]).find((project) => project.id === String(ncr.projectId))?.name ?? '—'}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {severityClass(ncr.severity)}">{ncr.severity}</span></td>
								<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(ncr.raisedDate)}<br />{formatDate(ncr.dueDate)}</td>
								<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(ncr.status)}">{ncr.status}</span></td>
								<td class="px-3 py-2 text-right">
									{#if ncr.status !== 'Closed'}<button onclick={() => setNcrStatus(ncr, 'Closed')} class="text-[10px] text-emerald-700 hover:underline">Close</button>{:else}<button onclick={() => setNcrStatus(ncr, 'Open')} class="text-[10px] text-amber-700 hover:underline">Reopen</button>{/if}
								</td>
							</tr>
						{:else}
							<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No NCRs raised.</td></tr>
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
				<h2 class="text-sm font-bold text-gray-800">{modal === 'inspection' ? 'New inspection' : 'Raise NCR'}</h2>
				<button onclick={() => (modal = '')} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
			</div>

			{#if modal === 'inspection'}
				<form onsubmit={createInspection} class="p-4 space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div><label for="insProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="insProject" bind:value={inspectionForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></div>
						<div><label for="insSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="insSite" bind:value={inspectionForm.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
						<div><label for="insType" class="block text-[10px] font-medium text-gray-700 mb-1">Type</label><select id="insType" bind:value={inspectionForm.type} class="w-full px-3 py-2 border border-gray-300 text-xs">{#each ['Site','Material','Concrete','Structural','Finishes'] as type}<option value={type}>{type}</option>{/each}</select></div>
						<div><label for="insDate" class="block text-[10px] font-medium text-gray-700 mb-1">Date</label><input id="insDate" type="date" bind:value={inspectionForm.inspectionDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="insInspector" class="block text-[10px] font-medium text-gray-700 mb-1">Inspector</label><input id="insInspector" bind:value={inspectionForm.inspectorName} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
						<div><label for="insStatus" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label><select id="insStatus" bind:value={inspectionForm.status} class="w-full px-3 py-2 border border-gray-300 text-xs"><option>Pending</option><option>Pass</option><option>Fail</option></select></div>
					</div>
					<div><label for="insFindings" class="block text-[10px] font-medium text-gray-700 mb-1">Findings</label><textarea id="insFindings" rows="2" bind:value={inspectionForm.findings} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<AttachmentField bind:documentId={inspectionForm.documentId} documents={data.documents} label="Test results / photos / evidence" projectId={inspectionForm.projectId} siteId={inspectionForm.siteId} />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Save inspection</button></div>
				</form>
			{:else}
				<form onsubmit={createNcr} class="p-4 space-y-3">
					<div><label for="ncrTitle" class="block text-[10px] font-medium text-gray-700 mb-1">Title *</label><input id="ncrTitle" required bind:value={ncrForm.title} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label for="ncrProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="ncrProject" bind:value={ncrForm.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></div>
						<div><label for="ncrSeverity" class="block text-[10px] font-medium text-gray-700 mb-1">Severity</label><select id="ncrSeverity" bind:value={ncrForm.severity} class="w-full px-3 py-2 border border-gray-300 text-xs">{#each ['Low','Medium','High','Critical'] as level}<option value={level}>{level}</option>{/each}</select></div>
						<div><label for="ncrDue" class="block text-[10px] font-medium text-gray-700 mb-1">Due date</label><input id="ncrDue" type="date" bind:value={ncrForm.dueDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					</div>
					<div><label for="ncrDescription" class="block text-[10px] font-medium text-gray-700 mb-1">Description</label><textarea id="ncrDescription" rows="2" bind:value={ncrForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<div><label for="ncrAction" class="block text-[10px] font-medium text-gray-700 mb-1">Corrective action</label><textarea id="ncrAction" rows="2" bind:value={ncrForm.correctiveAction} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
					<AttachmentField bind:documentId={ncrForm.documentId} documents={data.documents} label="Evidence / photos / report" projectId={ncrForm.projectId} siteId={ncrForm.siteId} />
					<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (modal = '')} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Raise NCR</button></div>
				</form>
			{/if}
		</div>
	</div>
{/if}
