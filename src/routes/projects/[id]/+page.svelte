<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const project = $derived(data.project as any);
	const documents = $derived(data.documents as any[]);

	let activeTab = $state('overview');
	let submitting = $state(false);
	let uploadFile = $state<File | null>(null);

	const tabs = [
		{ id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
		{ id: 'schedule', label: 'Phases & Milestones', icon: 'mdi:timeline-clock' },
		{ id: 'team', label: 'Team', icon: 'mdi:account-group' },
		{ id: 'documents', label: 'Documents', icon: 'mdi:folder-multiple' },
		{ id: 'commercial', label: 'Commercial', icon: 'mdi:cash-multiple' }
	];

	const statuses = ['Active', 'On Hold', 'Completed', 'Cancelled'];
	const teamRoles = [
		'Project Manager',
		'Site Engineer',
		'Quantity Surveyor',
		'Foreman',
		'Safety Officer',
		'Clerk of Works',
		'Architect',
		'Other'
	];

	let showEdit = $state(false);
	let showPhase = $state(false);
	let showMilestone = $state(false);
	let showTeam = $state(false);
	let showUpload = $state(false);
	let confirm = $state<{ open: boolean; title: string; message: string; action: () => Promise<void> }>({
		open: false,
		title: '',
		message: '',
		action: async () => {}
	});

	let editForm = $state({
		name: '',
		client: '',
		location: '',
		projectType: '',
		contractNumber: '',
		value: '',
		startDate: '',
		endDate: '',
		status: 'Active',
		progress: 0,
		managerId: '',
		description: ''
	});

	let phaseForm = $state({ name: '', startDate: '', endDate: '' });
	let milestoneForm = $state({ name: '', phaseId: '', dueDate: '' });
	let teamForm = $state({ employeeId: '', role: 'Site Engineer' });
	let uploadForm = $state({ title: '', description: '', documentTypeId: '', status: 'Draft' });

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
		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function formatSize(bytes: string | number | null | undefined): string {
		const size = Number(bytes ?? 0);
		if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
		if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`;
		return `${size} B`;
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'Active':
			case 'In Progress':
			case 'Completed':
				return 'bg-emerald-50 text-emerald-700';
			case 'On Hold':
			case 'Planned':
				return 'bg-amber-50 text-amber-700';
			case 'Cancelled':
			case 'Delayed':
				return 'bg-red-50 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function managerName(): string {
		if (!project.managerId) return 'Unassigned';
		const employee = (data.employees as any[]).find((item) => item.id === String(project.managerId));
		return employee ? `${employee.firstname} ${employee.lastname}` : 'Unassigned';
	}

	function askConfirm(title: string, message: string, action: () => Promise<void>) {
		confirm = { open: true, title, message, action };
	}

	async function api(url: string, method: string, body?: unknown) {
		const response = await fetch(url, {
			method,
			headers: body ? { 'Content-Type': 'application/json' } : undefined,
			body: body ? JSON.stringify(body) : undefined
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok || result.success === false) {
			throw new Error(result.error ?? `Request failed (${response.status})`);
		}
		return result;
	}

	function openEdit() {
		editForm = {
			name: project.name ?? '',
			client: project.client ?? '',
			location: project.location ?? '',
			projectType: project.projectType ?? '',
			contractNumber: project.contractNumber ?? '',
			value: project.value ? String(project.value) : '',
			startDate: project.startDate ? String(project.startDate).slice(0, 10) : '',
			endDate: project.endDate ? String(project.endDate).slice(0, 10) : '',
			status: project.status ?? 'Active',
			progress: project.progress ?? 0,
			managerId: project.managerId ? String(project.managerId) : '',
			description: project.description ?? ''
		};
		showEdit = true;
	}

	async function saveProject(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			await api(`/api/projects?id=${project.id}`, 'PUT', {
				name: editForm.name,
				client: editForm.client || null,
				location: editForm.location || null,
				projectType: editForm.projectType || null,
				contractNumber: editForm.contractNumber || null,
				value: editForm.value === '' ? null : Number(editForm.value),
				startDate: editForm.startDate || null,
				endDate: editForm.endDate || null,
				status: editForm.status,
				progress: Number(editForm.progress) || 0,
				managerId: editForm.managerId || null,
				description: editForm.description || null
			});
			toast.success('Project updated');
			showEdit = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not update the project');
		} finally {
			submitting = false;
		}
	}

	async function addPhase(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			await api(`/api/projects/${project.id}/phases`, 'POST', {
				name: phaseForm.name,
				startDate: phaseForm.startDate || null,
				endDate: phaseForm.endDate || null
			});
			toast.success('Phase added');
			phaseForm = { name: '', startDate: '', endDate: '' };
			showPhase = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not add the phase');
		} finally {
			submitting = false;
		}
	}

	async function savePhaseProgress(phase: any, progress: number) {
		try {
			await api(`/api/projects/${project.id}/phases/${phase.id}`, 'PATCH', { progress });
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not update progress');
		}
	}

	function removePhase(phase: any) {
		askConfirm('Delete phase?', `"${phase.name}" and its milestones will be removed.`, async () => {
			try {
				await api(`/api/projects/${project.id}/phases/${phase.id}`, 'DELETE');
				toast.success('Phase deleted');
				await invalidateAll();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Could not delete the phase');
			}
		});
	}

	async function addMilestone(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			await api(`/api/projects/${project.id}/milestones`, 'POST', {
				name: milestoneForm.name,
				phaseId: milestoneForm.phaseId || null,
				dueDate: milestoneForm.dueDate || null
			});
			toast.success('Milestone added');
			milestoneForm = { name: '', phaseId: '', dueDate: '' };
			showMilestone = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not add the milestone');
		} finally {
			submitting = false;
		}
	}

	async function setMilestoneStatus(milestone: any, completed: boolean) {
		try {
			await api(`/api/projects/${project.id}/milestones/${milestone.id}`, 'PATCH', {
				status: completed ? 'Completed' : 'Pending'
			});
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not update the milestone');
		}
	}

	function removeMilestone(milestone: any) {
		askConfirm('Delete milestone?', `"${milestone.name}" will be removed from the programme.`, async () => {
			try {
				await api(`/api/projects/${project.id}/milestones/${milestone.id}`, 'DELETE');
				toast.success('Milestone deleted');
				await invalidateAll();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Could not delete the milestone');
			}
		});
	}

	async function addTeamMember(event: Event) {
		event.preventDefault();
		submitting = true;
		try {
			await api(`/api/projects/${project.id}/team`, 'POST', {
				employeeId: teamForm.employeeId,
				role: teamForm.role
			});
			toast.success('Team member assigned');
			teamForm = { employeeId: '', role: 'Site Engineer' };
			showTeam = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not assign the team member');
		} finally {
			submitting = false;
		}
	}

	function removeTeamMember(member: any) {
		askConfirm(
			'Remove team member?',
			`${member.employee?.firstname ?? ''} ${member.employee?.lastname ?? ''} will be removed from this project.`,
			async () => {
				try {
					await api(`/api/projects/${project.id}/team?memberId=${member.id}`, 'DELETE');
					toast.success('Team member removed');
					await invalidateAll();
				} catch (error) {
					toast.error(error instanceof Error ? error.message : 'Could not remove the team member');
				}
			}
		);
	}

	async function uploadDocument(event: Event) {
		event.preventDefault();
		if (!uploadFile) {
			toast.error('Select a file to upload');
			return;
		}
		submitting = true;
		try {
			const formData = new FormData();
			formData.append('file', uploadFile);
			formData.append('title', uploadForm.title || uploadFile.name);
			formData.append('description', uploadForm.description);
			formData.append('documentTypeId', uploadForm.documentTypeId);
			formData.append('status', uploadForm.status);
			formData.append('projectId', String(project.id));

			const response = await fetch('/api/documents', { method: 'POST', body: formData });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || result.error) {
				throw new Error(result.error ?? 'Upload failed');
			}

			toast.success('Document attached to project');
			uploadForm = { title: '', description: '', documentTypeId: '', status: 'Draft' };
			uploadFile = null;
			showUpload = false;
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not upload the document');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="p-6">
	<a href="/projects" class="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to projects</span>
	</a>

	<div class="bg-[#114a4b] text-white p-5 mb-6 shadow">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-[10px] uppercase tracking-widest text-[#a8e2de]">{project.projectNumber}</p>
				<h1 class="text-lg font-semibold mt-1">{project.name}</h1>
				<p class="text-xs text-white/75 mt-1">
					{project.client ?? 'No client'} · {project.location ?? 'No location'} · {project.projectType ?? 'General'}
				</p>
				<p class="text-[10px] uppercase tracking-widest text-[#a8e2de] mt-4">Overall progress</p>
				<div class="flex items-center gap-3 mt-1">
					<p class="text-lg font-semibold">{project.progress}%</p>
					<div class="w-96 max-w-full bg-white/20 h-2">
						<div class="bg-[#5fc5c0] h-2" style={`width: ${project.progress}%`}></div>
					</div>
				</div>
				<p class="text-xs text-white/75 mt-2">{formatDate(project.startDate)} — {formatDate(project.endDate)}</p>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-[10px] px-2 py-1 bg-white/15 text-white">{project.status}</span>
				<button
					onclick={openEdit}
					class="flex items-center gap-2 px-3 py-2 border border-white/30 text-xs hover:bg-white/10 transition-colors"
				>
					<Icon icon="mdi:pencil" class="w-4 h-4" />
					Edit
				</button>
			</div>
		</div>
	</div>

	<div class="bg-white shadow">
		<div class="border-b border-gray-200">
			<nav class="flex overflow-x-auto">
				{#each tabs as tab}
					<button
						onclick={() => (activeTab = tab.id)}
						class="flex items-center gap-2 px-4 py-3 text-xs whitespace-nowrap border-b-2 transition-colors {activeTab === tab.id
							? 'border-[#5fc5c0] text-[#5fc5c0]'
							: 'border-transparent text-gray-600 hover:text-gray-800'}"
					>
						<Icon icon={tab.icon} class="w-4 h-4" />
						<span>{tab.label}</span>
					</button>
				{/each}
			</nav>
		</div>

		<div class="p-6">
			{#if activeTab === 'overview'}
				<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Contract value</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{project.value ? formatMWK(project.value) : '—'}</p>
					</div>
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Contract number</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{project.contractNumber ?? '—'}</p>
					</div>
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Project manager</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{managerName()}</p>
					</div>
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Project documents</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{documents.length}</p>
					</div>
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Cost to date</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{formatMWK(data.costTotal)}</p>
					</div>
				</div>

				{#if (data.costs as any[]).length}
					<div class="mb-6">
						<h3 class="text-xs font-semibold text-gray-700 mb-3">Cost breakdown (posted costs)</h3>
						<div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
							{#each data.costs as cost}
								<div class="border border-gray-200 px-3 py-2">
									<p class="text-[10px] text-gray-500">{cost.code} — {cost.name}</p>
									<p class="text-[11px] font-semibold text-gray-800">{formatMWK(cost.amount)}</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<h3 class="text-xs font-semibold text-gray-700 mb-3">Scope</h3>
						<p class="text-xs text-gray-600 leading-relaxed">
							{project.description ?? 'No description recorded for this project yet.'}
						</p>

						<h3 class="text-xs font-semibold text-gray-700 mt-6 mb-3">Phases</h3>
						<div class="space-y-3">
							{#each project.phases as phase (phase.id)}
								<div>
									<div class="flex items-center justify-between text-[11px]">
										<span class="text-gray-700">{phase.name}</span>
										<span class="text-gray-500">{phase.progress}%</span>
									</div>
									<div class="w-full bg-gray-200 h-1.5 mt-1">
										<div class="bg-[#5fc5c0] h-1.5" style={`width: ${phase.progress}%`}></div>
									</div>
								</div>
							{:else}
								<p class="text-[11px] text-gray-500">No phases defined. Add them on the schedule tab.</p>
							{/each}
						</div>
					</div>

					<div>
						<h3 class="text-xs font-semibold text-gray-700 mb-3">Upcoming milestones</h3>
						<div class="space-y-2">
							{#each project.milestones.filter((m: any) => m.status !== 'Completed').slice(0, 6) as milestone (milestone.id)}
								<div class="flex items-center justify-between border border-gray-200 px-3 py-2">
									<div>
										<p class="text-[11px] text-gray-700">{milestone.name}</p>
										<p class="text-[10px] text-gray-400">Due {formatDate(milestone.dueDate)}</p>
									</div>
									<span class="text-[10px] px-2 py-1 {statusClass(milestone.status)}">{milestone.status}</span>
								</div>
							{:else}
								<p class="text-[11px] text-gray-500">No pending milestones.</p>
							{/each}
						</div>

						{#if project.sites?.length}
							<h3 class="text-xs font-semibold text-gray-700 mt-6 mb-3">Sites</h3>
							<div class="space-y-2">
								{#each project.sites as site (site.id)}
									<a
										href={`/site-management/${site.id}`}
										class="flex items-center justify-between border border-gray-200 px-3 py-2 hover:bg-gray-50"
									>
										<span class="text-[11px] text-gray-700">{site.name}</span>
										<span class="text-[10px] text-gray-500">{site.progress}%</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>

			{:else if activeTab === 'schedule'}
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-xs font-semibold text-gray-700">Construction programme</h3>
					<div class="flex gap-2">
						<button
							onclick={() => (showPhase = true)}
							class="px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b]"
						>
							Add phase
						</button>
						<button
							onclick={() => (showMilestone = true)}
							class="px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
						>
							Add milestone
						</button>
					</div>
				</div>

				<div class="space-y-4">
					{#each project.phases as phase (phase.id)}
						<div class="border border-gray-200">
							<div class="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-3">
								<div>
									<p class="text-xs font-semibold text-gray-800">{phase.name}</p>
									<p class="text-[10px] text-gray-500">
										{formatDate(phase.startDate)} — {formatDate(phase.endDate)} · {phase.milestones?.length ?? 0} milestones
									</p>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-[10px] px-2 py-1 {statusClass(phase.status)}">{phase.status}</span>
									<input
										type="range"
										min="0"
										max="100"
										step="5"
										value={phase.progress}
										onchange={(event) => savePhaseProgress(phase, Number((event.currentTarget as HTMLInputElement).value))}
										class="w-28"
										aria-label={`Progress for ${phase.name}`}
									/>
									<span class="text-[10px] text-gray-600 w-8">{phase.progress}%</span>
									<button onclick={() => removePhase(phase)} class="text-red-600 hover:text-red-700">
										<Icon icon="mdi:trash-can-outline" class="w-4 h-4" />
									</button>
								</div>
							</div>
							<div class="divide-y divide-gray-100">
								{#each project.milestones.filter((m: any) => String(m.phaseId ?? '') === String(phase.id)) as milestone (milestone.id)}
									<div class="flex items-center justify-between px-4 py-2">
										<div class="flex items-center gap-3">
											<input
												type="checkbox"
												checked={milestone.status === 'Completed'}
												onchange={(event) =>
													setMilestoneStatus(
														milestone,
														(event.currentTarget as HTMLInputElement).checked
													)}
												class="accent-[#5fc5c0]"
												aria-label={`Complete ${milestone.name}`}
											/>
											<div>
												<p class="text-[11px] text-gray-700 {milestone.status === 'Completed' ? 'line-through text-gray-400' : ''}">
													{milestone.name}
												</p>
												<p class="text-[10px] text-gray-400">Due {formatDate(milestone.dueDate)}</p>
											</div>
										</div>
										<button onclick={() => removeMilestone(milestone)} class="text-gray-400 hover:text-red-600">
											<Icon icon="mdi:close" class="w-4 h-4" />
										</button>
									</div>
								{:else}
									<p class="px-4 py-2 text-[10px] text-gray-400">No milestones in this phase.</p>
								{/each}
							</div>
						</div>
					{:else}
						<div class="border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500">
							No phases yet. Add the first phase (e.g., Site establishment, Substructure, Superstructure, Finishes, Handover).
						</div>
					{/each}
				</div>

			{:else if activeTab === 'team'}
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-xs font-semibold text-gray-700">Project team</h3>
					<button
						onclick={() => (showTeam = true)}
						class="px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b]"
					>
						Assign employee
					</button>
				</div>
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Employee</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Role</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Contact</th>
							<th class="px-4 py-2 text-right text-[10px] uppercase text-gray-500"></th>
						</tr>
					</thead>
					<tbody>
						{#each project.teamMembers as member (member.id)}
							<tr class="border-b border-gray-100">
								<td class="px-4 py-2">
									<p class="text-xs text-gray-800">
										{member.employee?.firstname} {member.employee?.lastname}
									</p>
									<p class="text-[10px] text-gray-500">{member.employee?.employeeNumber}</p>
								</td>
								<td class="px-4 py-2 text-xs text-gray-600">{member.role}</td>
								<td class="px-4 py-2 text-[11px] text-gray-600">
									{member.employee?.phone ?? member.employee?.email ?? '—'}
								</td>
								<td class="px-4 py-2 text-right">
									<button onclick={() => removeTeamMember(member)} class="text-red-600 hover:text-red-700 text-[10px]">
										Remove
									</button>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-4 py-8 text-center text-xs text-gray-500">
									No team assigned yet.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

			{:else if activeTab === 'documents'}
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-xs font-semibold text-gray-700">Project documents</h3>
						<p class="text-[10px] text-gray-500">Contracts, drawings, BOQs, approvals and site records linked to this project.</p>
					</div>
					<button
						onclick={() => (showUpload = true)}
						class="px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b]"
					>
						Upload document
					</button>
				</div>

				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Document</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Type</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Uploaded</th>
							<th class="px-4 py-2 text-right text-[10px] uppercase text-gray-500">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each documents as document (document.id)}
							<tr class="border-b border-gray-100 hover:bg-gray-50">
								<td class="px-4 py-2">
									<a href={`/documents/${document.id}`} class="text-xs text-[#114a4b] hover:underline">
										{document.title}
									</a>
									<p class="text-[10px] text-gray-500">{document.fileName} · {formatSize(document.fileSize)}</p>
								</td>
								<td class="px-4 py-2 text-[11px] text-gray-600">{document.documentType?.name ?? '—'}</td>
								<td class="px-4 py-2">
									<span class="text-[10px] px-2 py-1 bg-gray-100 text-gray-700">{document.status}</span>
								</td>
								<td class="px-4 py-2 text-[10px] text-gray-500">
									{formatDate(document.createdAt)}<br />
									{document.owner?.firstname} {document.owner?.lastname}
								</td>
								<td class="px-4 py-2 text-right">
									<a
										href={`/api/documents/${document.id}?download=true`}
										class="text-[10px] text-[#114a4b] hover:underline"
									>
										Download
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="px-4 py-8 text-center text-xs text-gray-500">
									No documents attached to this project yet.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

			{:else if activeTab === 'commercial'}
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Contract value</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{project.value ? formatMWK(project.value) : '—'}</p>
					</div>
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Linked tenders</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{project.tenders?.length ?? 0}</p>
					</div>
					<div class="bg-gray-50 p-4">
						<p class="text-[10px] uppercase text-gray-500">Active sites</p>
						<p class="text-sm font-semibold text-gray-800 mt-1">{project.sites?.length ?? 0}</p>
					</div>
				</div>

				<h3 class="text-xs font-semibold text-gray-700 mb-3">Source tenders</h3>
				<table class="w-full mb-6">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Tender</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Client</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
							<th class="px-4 py-2 text-right text-[10px] uppercase text-gray-500">Value</th>
						</tr>
					</thead>
					<tbody>
						{#each project.tenders as tender (tender.id)}
							<tr class="border-b border-gray-100">
								<td class="px-4 py-2">
									<a href={`/bidding/${tender.id}`} class="text-xs text-[#114a4b] hover:underline">
										{tender.tenderNumber} — {tender.title}
									</a>
								</td>
								<td class="px-4 py-2 text-[11px] text-gray-600">{tender.client}</td>
								<td class="px-4 py-2 text-[11px] text-gray-600">{tender.status}</td>
								<td class="px-4 py-2 text-right text-xs text-gray-700">
									{tender.value ? formatMWK(tender.value) : '—'}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-4 py-6 text-center text-xs text-gray-500">No tenders linked.</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<h3 class="text-xs font-semibold text-gray-700 mb-3">Execution sites</h3>
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Site</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Status</th>
							<th class="px-4 py-2 text-left text-[10px] uppercase text-gray-500">Progress</th>
							<th class="px-4 py-2 text-right text-[10px] uppercase text-gray-500">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each project.sites as site (site.id)}
							<tr class="border-b border-gray-100">
								<td class="px-4 py-2 text-xs text-gray-700">{site.name}</td>
								<td class="px-4 py-2 text-[11px] text-gray-600">{site.status}</td>
								<td class="px-4 py-2">
									<div class="w-32 bg-gray-200 h-1.5">
										<div class="bg-[#5fc5c0] h-1.5" style={`width: ${site.progress}%`}></div>
									</div>
								</td>
								<td class="px-4 py-2 text-right">
									<a href={`/site-management/${site.id}`} class="text-[10px] text-[#114a4b] hover:underline">
										Open site
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-4 py-6 text-center text-xs text-gray-500">No sites linked.</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>

<!-- Edit project -->
{#if showEdit}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">Edit project</h2>
				<button onclick={() => (showEdit = false)} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={saveProject} class="p-4 grid grid-cols-2 gap-4">
				<div class="col-span-2">
					<label for="editProjectName" class="block text-[10px] font-medium text-gray-700 mb-1">Project name *</label>
					<input id="editProjectName" required bind:value={editForm.name} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectClient" class="block text-[10px] font-medium text-gray-700 mb-1">Client</label>
					<input id="editProjectClient" bind:value={editForm.client} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectLocation" class="block text-[10px] font-medium text-gray-700 mb-1">Location</label>
					<input id="editProjectLocation" bind:value={editForm.location} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectType" class="block text-[10px] font-medium text-gray-700 mb-1">Project type</label>
					<input id="editProjectType" bind:value={editForm.projectType} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectContract" class="block text-[10px] font-medium text-gray-700 mb-1">Contract number</label>
					<input id="editProjectContract" bind:value={editForm.contractNumber} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectValue" class="block text-[10px] font-medium text-gray-700 mb-1">Contract value (MWK)</label>
					<input id="editProjectValue" type="number" min="0" bind:value={editForm.value} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectManager" class="block text-[10px] font-medium text-gray-700 mb-1">Project manager</label>
					<select id="editProjectManager" bind:value={editForm.managerId} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						<option value="">Unassigned</option>
						{#each data.employees as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="editProjectStart" class="block text-[10px] font-medium text-gray-700 mb-1">Start date</label>
					<input id="editProjectStart" type="date" bind:value={editForm.startDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectEnd" class="block text-[10px] font-medium text-gray-700 mb-1">End date</label>
					<input id="editProjectEnd" type="date" bind:value={editForm.endDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="editProjectStatus" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
					<select id="editProjectStatus" bind:value={editForm.status} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						{#each statuses as status}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="editProjectProgress" class="block text-[10px] font-medium text-gray-700 mb-1">Progress (%)</label>
					<input id="editProjectProgress" type="number" min="0" max="100" bind:value={editForm.progress} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div class="col-span-2">
					<label for="editProjectDescription" class="block text-[10px] font-medium text-gray-700 mb-1">Scope</label>
					<textarea id="editProjectDescription" rows="3" bind:value={editForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"></textarea>
				</div>
				<div class="col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-200">
					<button type="button" onclick={() => (showEdit = false)} class="px-3 py-2 text-xs border border-gray-300 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b] disabled:opacity-60">
						{submitting ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Add phase -->
{#if showPhase}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-md shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">Add phase</h2>
				<button onclick={() => (showPhase = false)} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={addPhase} class="p-4 space-y-3">
				<div>
					<label for="phaseName" class="block text-[10px] font-medium text-gray-700 mb-1">Phase name *</label>
					<input id="phaseName" required bind:value={phaseForm.name} placeholder="e.g., Substructure" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="phaseStart" class="block text-[10px] font-medium text-gray-700 mb-1">Start date</label>
						<input id="phaseStart" type="date" bind:value={phaseForm.startDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="phaseEnd" class="block text-[10px] font-medium text-gray-700 mb-1">End date</label>
						<input id="phaseEnd" type="date" bind:value={phaseForm.endDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
					<button type="button" onclick={() => (showPhase = false)} class="px-3 py-2 text-xs border border-gray-300 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b] disabled:opacity-60">Add phase</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Add milestone -->
{#if showMilestone}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-md shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">Add milestone</h2>
				<button onclick={() => (showMilestone = false)} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={addMilestone} class="p-4 space-y-3">
				<div>
					<label for="milestoneName" class="block text-[10px] font-medium text-gray-700 mb-1">Milestone *</label>
					<input id="milestoneName" required bind:value={milestoneForm.name} placeholder="e.g., Roof slab cast" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="milestonePhase" class="block text-[10px] font-medium text-gray-700 mb-1">Phase</label>
					<select id="milestonePhase" bind:value={milestoneForm.phaseId} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						<option value="">Unassigned</option>
						{#each project.phases as phase}
							<option value={phase.id}>{phase.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="milestoneDue" class="block text-[10px] font-medium text-gray-700 mb-1">Due date</label>
					<input id="milestoneDue" type="date" bind:value={milestoneForm.dueDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
					<button type="button" onclick={() => (showMilestone = false)} class="px-3 py-2 text-xs border border-gray-300 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b] disabled:opacity-60">Add milestone</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Assign team -->
{#if showTeam}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-md shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">Assign employee</h2>
				<button onclick={() => (showTeam = false)} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={addTeamMember} class="p-4 space-y-3">
				<div>
					<label for="teamEmployee" class="block text-[10px] font-medium text-gray-700 mb-1">Employee *</label>
					<select id="teamEmployee" required bind:value={teamForm.employeeId} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						<option value="">Select employee</option>
						{#each data.employees as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="teamRole" class="block text-[10px] font-medium text-gray-700 mb-1">Role *</label>
					<select id="teamRole" bind:value={teamForm.role} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						{#each teamRoles as role}
							<option value={role}>{role}</option>
						{/each}
					</select>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
					<button type="button" onclick={() => (showTeam = false)} class="px-3 py-2 text-xs border border-gray-300 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b] disabled:opacity-60">Assign</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Upload document -->
{#if showUpload}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white w-full max-w-lg shadow-xl">
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h2 class="text-sm font-bold text-gray-800">Upload project document</h2>
				<button onclick={() => (showUpload = false)} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={uploadDocument} class="p-4 space-y-3">
				<div>
					<label for="docFile" class="block text-[10px] font-medium text-gray-700 mb-1">File *</label>
					<input
						id="docFile"
						type="file"
						required
						onchange={(event) => (uploadFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
						class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					/>
					<p class="text-[10px] text-gray-400 mt-1">PDF, Office, images, CAD (DWG/DXF/IFC) and archives up to 25 MB.</p>
				</div>
				<div>
					<label for="docTitle" class="block text-[10px] font-medium text-gray-700 mb-1">Title</label>
					<input id="docTitle" bind:value={uploadForm.title} placeholder="Defaults to the file name" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="docType" class="block text-[10px] font-medium text-gray-700 mb-1">Document type</label>
						<select id="docType" bind:value={uploadForm.documentTypeId} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="">Unclassified</option>
							{#each data.documentTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="docStatus" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
						<select id="docStatus" bind:value={uploadForm.status} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Draft">Draft</option>
							<option value="For Review">For Review</option>
							<option value="Approved">Approved</option>
						</select>
					</div>
				</div>
				<div>
					<label for="docDescription" class="block text-[10px] font-medium text-gray-700 mb-1">Description</label>
					<textarea id="docDescription" rows="2" bind:value={uploadForm.description} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"></textarea>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
					<button type="button" onclick={() => (showUpload = false)} class="px-3 py-2 text-xs border border-gray-300 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={submitting} class="px-3 py-2 text-xs bg-[#5fc5c0] text-white font-semibold hover:bg-[#114a4b] disabled:opacity-60">
						{submitting ? 'Uploading…' : 'Upload'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmDialog
	open={confirm.open}
	title={confirm.title}
	message={confirm.message}
	confirmText="Delete"
	onConfirm={async () => {
		confirm = { ...confirm, open: false };
		await confirm.action();
	}}
	onCancel={() => (confirm = { ...confirm, open: false })}
/>
