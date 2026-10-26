<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let statusFilter = $state('');
	let clientFilter = $state('');

	let showModal = $state(false);
	let showDelete = $state(false);
	let submitting = $state(false);
	let editingId = $state<string | null>(null);
	let deletingProject = $state<any>(null);

	const blankForm = () => ({
		name: '',
		client: '',
		location: '',
		projectType: 'Building',
		contractNumber: '',
		value: '',
		startDate: '',
		endDate: '',
		status: 'Active',
		progress: 0,
		managerId: '',
		tenderId: '',
		description: ''
	});

	let form = $state(blankForm());

	const statuses = ['Active', 'On Hold', 'Completed', 'Cancelled'];
	const projectTypes = ['Building', 'Roads & Drainage', 'Water & Sanitation', 'Electrical', 'Civil Works', 'Maintenance', 'Other'];

	const projects = $derived(
		(data.projects as any[]).filter((project) => {
			const query = search.trim().toLowerCase();
			const matchesQuery =
				!query ||
				[project.name, project.client, project.projectNumber, project.location]
					.filter(Boolean)
					.some((value: string) => value.toLowerCase().includes(query));
			const matchesStatus = !statusFilter || project.status === statusFilter;
			const matchesClient = !clientFilter || (project.client ?? '').toLowerCase().includes(clientFilter.toLowerCase());
			return matchesQuery && matchesStatus && matchesClient;
		})
	);

	const kpis = $derived.by(() => {
		const list = data.projects as any[];
		const active = list.filter((project) => project.status === 'Active').length;
		const totalValue = list.reduce((sum, project) => sum + Number(project.value ?? 0), 0);
		const documents = list.reduce((sum, project) => sum + (project._count?.documents ?? 0), 0);
		return { total: list.length, active, totalValue, documents };
	});

	function employeeName(id: string | null | undefined): string {
		if (!id) return 'Unassigned';
		const employee = (data.employees as any[]).find((item) => item.id === String(id));
		return employee ? `${employee.firstname} ${employee.lastname}` : 'Unassigned';
	}

	function formatMWK(value: number | null | undefined): string {
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

	function statusClass(status: string): string {
		switch (status) {
			case 'Active':
				return 'bg-emerald-50 text-emerald-700';
			case 'Completed':
				return 'bg-blue-50 text-blue-700';
			case 'On Hold':
				return 'bg-amber-50 text-amber-700';
			case 'Cancelled':
				return 'bg-red-50 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function openCreate() {
		editingId = null;
		form = blankForm();
		showModal = true;
	}

	function openEdit(project: any) {
		editingId = project.id;
		form = {
			name: project.name ?? '',
			client: project.client ?? '',
			location: project.location ?? '',
			projectType: project.projectType ?? 'Building',
			contractNumber: project.contractNumber ?? '',
			value: project.value ? String(project.value) : '',
			startDate: project.startDate ? String(project.startDate).slice(0, 10) : '',
			endDate: project.endDate ? String(project.endDate).slice(0, 10) : '',
			status: project.status ?? 'Active',
			progress: project.progress ?? 0,
			managerId: project.managerId ? String(project.managerId) : '',
			tenderId: '',
			description: project.description ?? ''
		};
		showModal = true;
	}

	function onTenderChange() {
		const tender = (data.tenders as any[]).find((item) => item.id === form.tenderId);
		if (tender) {
			form.name = tender.title ?? form.name;
			form.client = tender.client ?? form.client;
		}
	}

	async function saveProject(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			const payload: Record<string, unknown> = {
				name: form.name,
				client: form.client || null,
				location: form.location || null,
				projectType: form.projectType || null,
				contractNumber: form.contractNumber || null,
				value: form.value === '' ? null : Number(form.value),
				startDate: form.startDate || null,
				endDate: form.endDate || null,
				status: form.status,
				progress: Number(form.progress) || 0,
				managerId: form.managerId || null,
				description: form.description || null
			};
			if (form.tenderId) payload.tenderId = form.tenderId;

			const response = await fetch(
				editingId ? `/api/projects?id=${editingId}` : '/api/projects',
				{
					method: editingId ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			const result = await response.json();

			if (!response.ok || !result.success) {
				toast.error(result.error ?? 'Could not save the project');
				return;
			}

			toast.success(editingId ? 'Project updated' : 'Project created');
			showModal = false;
			await invalidateAll();
		} catch {
			toast.error('Could not reach the server');
		} finally {
			submitting = false;
		}
	}

	function askDelete(project: any) {
		deletingProject = project;
		showDelete = true;
	}

	async function deleteProject() {
		if (!deletingProject) return;
		const response = await fetch(`/api/projects?id=${deletingProject.id}`, { method: 'DELETE' });
		const result = await response.json();
		showDelete = false;
		if (response.ok && result.success) {
			toast.success('Project deleted');
			await invalidateAll();
		} else {
			toast.error(result.error ?? 'Could not delete the project');
		}
		deletingProject = null;
	}
</script>

<div class="p-6">
	<div class="flex items-start justify-between mb-6">
		<div>
			<h1 class="text-lg font-bold text-gray-800">Projects</h1>
			<p class="text-xs text-gray-500 mt-1">Contracts under execution, their programmes and documentation.</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 bg-[#5fc5c0] text-white px-3 py-2 text-xs font-semibold hover:bg-[#114a4b] transition-colors"
		>
			<Icon icon="mdi:plus" class="w-4 h-4" />
			New Project
		</button>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 shadow">
			<p class="text-[10px] uppercase tracking-wide text-gray-500">Projects</p>
			<p class="text-xl font-semibold text-gray-800 mt-1">{kpis.total}</p>
		</div>
		<div class="bg-white p-4 shadow">
			<p class="text-[10px] uppercase tracking-wide text-gray-500">Active</p>
			<p class="text-xl font-semibold text-emerald-600 mt-1">{kpis.active}</p>
		</div>
		<div class="bg-white p-4 shadow">
			<p class="text-[10px] uppercase tracking-wide text-gray-500">Contract value</p>
			<p class="text-xl font-semibold text-gray-800 mt-1">{formatMWK(kpis.totalValue)}</p>
		</div>
		<div class="bg-white p-4 shadow">
			<p class="text-[10px] uppercase tracking-wide text-gray-500">Documents</p>
			<p class="text-xl font-semibold text-gray-800 mt-1">{kpis.documents}</p>
		</div>
	</div>

	<div class="bg-white shadow mb-4 p-4 flex flex-wrap items-end gap-3">
		<div class="flex-1 min-w-[220px]">
			<label for="projectSearch" class="block text-[10px] font-medium text-gray-700 mb-1">Search</label>
			<input
				id="projectSearch"
				type="text"
				bind:value={search}
				placeholder="Project, client, number or location"
				class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
			/>
		</div>
		<div>
			<label for="projectStatus" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
			<select
				id="projectStatus"
				bind:value={statusFilter}
				class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
			>
				<option value="">All</option>
				{#each statuses as status}
					<option value={status}>{status}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="projectClientFilter" class="block text-[10px] font-medium text-gray-700 mb-1">Client</label>
			<input
				id="projectClientFilter"
				type="text"
				bind:value={clientFilter}
				placeholder="Filter client"
				class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
			/>
		</div>
	</div>

	<div class="bg-white shadow overflow-x-auto">
		<table class="w-full min-w-[980px]">
			<thead class="bg-gray-50 border-b border-gray-200">
				<tr>
					<th class="px-4 py-3 text-left text-[10px] uppercase text-gray-500">Project</th>
					<th class="px-4 py-3 text-left text-[10px] uppercase text-gray-500">Client / Location</th>
					<th class="px-4 py-3 text-left text-[10px] uppercase text-gray-500">Programme</th>
					<th class="px-4 py-3 text-left text-[10px] uppercase text-gray-500">Progress</th>
					<th class="px-4 py-3 text-right text-[10px] uppercase text-gray-500">Value</th>
					<th class="px-4 py-3 text-center text-[10px] uppercase text-gray-500">Docs</th>
					<th class="px-4 py-3 text-left text-[10px] uppercase text-gray-500">Status</th>
					<th class="px-4 py-3 text-right text-[10px] uppercase text-gray-500">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each projects as project (project.id)}
					<tr class="border-b border-gray-100 hover:bg-gray-50">
						<td class="px-4 py-3">
							<a href={`/projects/${project.id}`} class="text-xs font-semibold text-[#114a4b] hover:underline">
								{project.name}
							</a>
							<p class="text-[10px] text-gray-500">{project.projectNumber} · {project.projectType ?? 'General'}</p>
							<p class="text-[10px] text-gray-400">Manager: {employeeName(project.managerId)}</p>
						</td>
						<td class="px-4 py-3">
							<p class="text-xs text-gray-700">{project.client ?? '—'}</p>
							<p class="text-[10px] text-gray-500">{project.location ?? '—'}</p>
						</td>
						<td class="px-4 py-3 text-[11px] text-gray-600">
							<p>{formatDate(project.startDate)}</p>
							<p class="text-gray-400">to {formatDate(project.endDate)}</p>
						</td>
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								<div class="w-24 bg-gray-200 h-1.5">
									<div class="bg-[#5fc5c0] h-1.5" style={`width: ${project.progress ?? 0}%`}></div>
								</div>
								<span class="text-[10px] text-gray-600">{project.progress ?? 0}%</span>
							</div>
							<p class="text-[10px] text-gray-400 mt-1">
								{project._count?.phases ?? 0} phases · {project.sites?.length ?? 0} sites
							</p>
						</td>
						<td class="px-4 py-3 text-right text-xs text-gray-700">
							{project.value ? formatMWK(project.value) : '—'}
						</td>
						<td class="px-4 py-3 text-center text-xs text-gray-700">{project._count?.documents ?? 0}</td>
						<td class="px-4 py-3">
							<span class="text-[10px] px-2 py-1 {statusClass(project.status)}">{project.status}</span>
						</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-2">
								<a
									href={`/projects/${project.id}`}
									class="text-[10px] px-2 py-1 border border-gray-300 text-gray-700 hover:bg-gray-100"
								>
									Open
								</a>
								<button
									onclick={() => openEdit(project)}
									class="text-[10px] px-2 py-1 border border-gray-300 text-gray-700 hover:bg-gray-100"
								>
									Edit
								</button>
								<button
									onclick={() => askDelete(project)}
									class="text-[10px] px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50"
								>
									Delete
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="px-4 py-10 text-center text-xs text-gray-500">
							No projects yet. Create one manually, or convert a won tender from the Bidding module.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">{editingId ? 'Edit Project' : 'New Project'}</h2>
				<button onclick={() => (showModal = false)} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={saveProject} class="p-4 space-y-4">
				{#if !editingId}
					<div>
						<label for="projectTender" class="block text-[10px] font-medium text-gray-700 mb-1">
							Create from a tender (optional)
						</label>
						<select
							id="projectTender"
							bind:value={form.tenderId}
							onchange={onTenderChange}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						>
							<option value="">Start blank</option>
							{#each data.tenders as tender}
								<option value={tender.id}>{tender.tenderNumber} — {tender.title}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<div class="col-span-2">
						<label for="projectName" class="block text-[10px] font-medium text-gray-700 mb-1">Project name *</label>
						<input
							id="projectName"
							required
							bind:value={form.name}
							placeholder="e.g., Ntcheu District Hospital"
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectClient" class="block text-[10px] font-medium text-gray-700 mb-1">Client</label>
						<input
							id="projectClient"
							bind:value={form.client}
							placeholder="e.g., Ministry of Health"
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectLocation" class="block text-[10px] font-medium text-gray-700 mb-1">Location</label>
						<input
							id="projectLocation"
							bind:value={form.location}
							placeholder="e.g., Ntcheu"
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectType" class="block text-[10px] font-medium text-gray-700 mb-1">Project type</label>
						<select
							id="projectType"
							bind:value={form.projectType}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						>
							{#each projectTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="projectContract" class="block text-[10px] font-medium text-gray-700 mb-1">Contract number</label>
						<input
							id="projectContract"
							bind:value={form.contractNumber}
							placeholder="e.g., CON/MOH/2026/014"
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectValue" class="block text-[10px] font-medium text-gray-700 mb-1">Contract value (MWK)</label>
						<input
							id="projectValue"
							type="number"
							min="0"
							bind:value={form.value}
							placeholder="e.g., 850000000"
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectManager" class="block text-[10px] font-medium text-gray-700 mb-1">Project manager</label>
						<select
							id="projectManager"
							bind:value={form.managerId}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						>
							<option value="">Unassigned</option>
							{#each data.employees as employee}
								<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="projectStart" class="block text-[10px] font-medium text-gray-700 mb-1">Start date</label>
						<input
							id="projectStart"
							type="date"
							bind:value={form.startDate}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectEnd" class="block text-[10px] font-medium text-gray-700 mb-1">End date</label>
						<input
							id="projectEnd"
							type="date"
							bind:value={form.endDate}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="projectStatusField" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
						<select
							id="projectStatusField"
							bind:value={form.status}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						>
							{#each statuses as status}
								<option value={status}>{status}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="projectProgress" class="block text-[10px] font-medium text-gray-700 mb-1">Progress (%)</label>
						<input
							id="projectProgress"
							type="number"
							min="0"
							max="100"
							bind:value={form.progress}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div class="col-span-2">
						<label for="projectDescription" class="block text-[10px] font-medium text-gray-700 mb-1">Scope / description</label>
						<textarea
							id="projectDescription"
							rows="3"
							bind:value={form.description}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						></textarea>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
					<button
						type="button"
						onclick={() => (showModal = false)}
						class="px-3 py-2 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={submitting}
						class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b] disabled:opacity-60"
					>
						{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create project'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmDialog
	open={showDelete}
	title="Delete project?"
	message={`${deletingProject?.name ?? 'This project'} will be removed from the active register. Documents and history are retained.`}
	confirmText="Delete"
	onConfirm={deleteProject}
	onCancel={() => (showDelete = false)}
/>
