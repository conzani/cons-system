<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import AttachmentField from '$lib/components/AttachmentField.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const incidents = $derived(data.incidents as any[]);

	let showModal = $state(false);
	let submitting = $state(false);
	let form = $state({ projectId: '', siteId: '', incidentDate: today(), type: 'Near Miss', severity: 'Low', description: '', lostDays: 0, correctiveAction: '', reportedBy: '', documentId: '' });

	function today(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function statusClass(status: string): string {
		if (status === 'Closed') return 'bg-emerald-50 text-emerald-700';
		if (status === 'Investigating') return 'bg-amber-50 text-amber-700';
		return 'bg-red-50 text-red-700';
	}

	async function createIncident(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const response = await fetch('/api/hse/incidents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...form, projectId: form.projectId || null, siteId: form.siteId || null })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error);
			toast.success('Incident reported');
			showModal = false;
			form = { projectId: '', siteId: '', incidentDate: today(), type: 'Near Miss', severity: 'Low', description: '', lostDays: 0, correctiveAction: '', reportedBy: '', documentId: '' };
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not report incident');
		} finally {
			submitting = false;
		}
	}

	async function setStatus(incident: any, status: string) {
		try {
			const response = await fetch('/api/hse/incidents', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: incident.id, status })
			});
			if (!response.ok) throw new Error();
			await invalidateAll();
		} catch {
			toast.error('Could not update incident');
		}
	}
</script>

<div class="p-6">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Health, Safety & Environment</h1>
			<p class="text-xs text-gray-500 mt-1">Incident register, lost-time tracking and close-out actions.</p>
		</div>
		<button onclick={() => (showModal = true)} class="px-3 py-2 bg-[#5fc5c0] text-white text-xs font-semibold hover:bg-[#114a4b]">Report incident</button>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Incidents</p><p class="text-lg font-semibold text-gray-800 mt-1">{incidents.length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Open</p><p class="text-lg font-semibold text-red-600 mt-1">{incidents.filter((item) => item.status !== 'Closed').length}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Lost days</p><p class="text-lg font-semibold text-amber-600 mt-1">{incidents.reduce((sum, item) => sum + Number(item.lostDays ?? 0), 0)}</p></div>
		<div class="bg-white p-4 shadow"><p class="text-[10px] uppercase text-gray-500">Critical</p><p class="text-lg font-semibold text-red-700 mt-1">{incidents.filter((item) => item.severity === 'Critical').length}</p></div>
	</div>

	<div class="bg-white shadow p-6">
		<table class="w-full">
			<thead class="bg-gray-50 border-b border-gray-200"><tr>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Incident</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Project</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Type / Severity</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Date</th>
				<th class="px-3 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
				<th class="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Actions</th>
			</tr></thead>
			<tbody>
				{#each incidents as incident}
					<tr class="border-b border-gray-100">
						<td class="px-3 py-2"><p class="text-[11px] text-gray-800">{incident.incidentNumber}</p><p class="text-[10px] text-gray-400 max-w-xs truncate">{incident.description}</p>{#if incident.documentId}<a href={`/documents/${incident.documentId}`} class="text-[9px] text-[#5fc5c0] hover:underline">Evidence</a>{/if}</td>
						<td class="px-3 py-2 text-[10px] text-gray-500">{(data.projects as any[]).find((project) => project.id === String(incident.projectId))?.name ?? '—'}</td>
						<td class="px-3 py-2 text-[10px] text-gray-500">{incident.type}<br /><span class="text-red-600">{incident.severity}</span></td>
						<td class="px-3 py-2 text-[10px] text-gray-500">{formatDate(incident.incidentDate)}</td>
						<td class="px-3 py-2"><span class="text-[10px] px-2 py-1 {statusClass(incident.status)}">{incident.status}</span></td>
						<td class="px-3 py-2 text-right space-x-2">
							{#if incident.status === 'Open'}<button onclick={() => setStatus(incident, 'Investigating')} class="text-[10px] text-amber-700 hover:underline">Investigate</button>{/if}
							{#if incident.status !== 'Closed'}<button onclick={() => setStatus(incident, 'Closed')} class="text-[10px] text-emerald-700 hover:underline">Close</button>{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-3 py-8 text-center text-xs text-gray-500">No incidents reported.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200"><h2 class="text-sm font-bold text-gray-800">Report incident</h2><button onclick={() => (showModal = false)} class="text-gray-500"><Icon icon="mdi:close" class="w-5 h-5" /></button></div>
			<form onsubmit={createIncident} class="p-4 space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div><label for="hseProject" class="block text-[10px] font-medium text-gray-700 mb-1">Project</label><select id="hseProject" bind:value={form.projectId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.projects as project}<option value={project.id}>{project.name}</option>{/each}</select></div>
					<div><label for="hseSite" class="block text-[10px] font-medium text-gray-700 mb-1">Site</label><select id="hseSite" bind:value={form.siteId} class="w-full px-3 py-2 border border-gray-300 text-xs"><option value="">Not linked</option>{#each data.sites as site}<option value={site.id}>{site.name}</option>{/each}</select></div>
					<div><label for="hseDate" class="block text-[10px] font-medium text-gray-700 mb-1">Date</label><input id="hseDate" type="date" bind:value={form.incidentDate} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
					<div><label for="hseType" class="block text-[10px] font-medium text-gray-700 mb-1">Type</label><select id="hseType" bind:value={form.type} class="w-full px-3 py-2 border border-gray-300 text-xs">{#each ['Near Miss','Injury','Property Damage','Environmental'] as type}<option value={type}>{type}</option>{/each}</select></div>
					<div><label for="hseSeverity" class="block text-[10px] font-medium text-gray-700 mb-1">Severity</label><select id="hseSeverity" bind:value={form.severity} class="w-full px-3 py-2 border border-gray-300 text-xs">{#each ['Low','Medium','High','Critical'] as level}<option value={level}>{level}</option>{/each}</select></div>
					<div><label for="hseLost" class="block text-[10px] font-medium text-gray-700 mb-1">Lost days</label><input id="hseLost" type="number" min="0" bind:value={form.lostDays} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
				</div>
				<div><label for="hseDesc" class="block text-[10px] font-medium text-gray-700 mb-1">Description *</label><textarea id="hseDesc" rows="3" required bind:value={form.description} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
				<div><label for="hseAction" class="block text-[10px] font-medium text-gray-700 mb-1">Corrective action</label><textarea id="hseAction" rows="2" bind:value={form.correctiveAction} class="w-full px-3 py-2 border border-gray-300 text-xs"></textarea></div>
				<div><label for="hseReporter" class="block text-[10px] font-medium text-gray-700 mb-1">Reported by</label><input id="hseReporter" bind:value={form.reportedBy} class="w-full px-3 py-2 border border-gray-300 text-xs" /></div>
				<AttachmentField bind:documentId={form.documentId} documents={data.documents} label="Photos / evidence / report" projectId={form.projectId} siteId={form.siteId} />
				<div class="flex justify-end gap-2 pt-2 border-t border-gray-200"><button type="button" onclick={() => (showModal = false)} class="px-3 py-2 text-xs border border-gray-300">Cancel</button><button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold disabled:opacity-60">Report</button></div>
			</form>
		</div>
	</div>
{/if}
