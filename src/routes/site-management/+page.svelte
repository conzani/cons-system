<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let tenderOpportunities = $state<any[]>([]);
	let siteManagers = $state<any[]>([]);
	let realEmployees = $state<any[]>([]);
	let sites = $state<any[]>([]);

	async function loadSites() {
		try {
			const response = await fetch('/api/sites');
			if (!response.ok) return;
			const data = await response.json();
			sites = Array.isArray(data) ? data : [];
		} catch (error) {
			console.error('Error loading sites:', error);
		}
	}

	let showCreateModal = $state(false);
	let searchQuery = $state('');
	let filterStatus = $state('');
	let filterLocation = $state('');
	let filterClient = $state('');
	let filterProjectType = $state('');

	// Form state
	let newSiteName = $state('');
	let newLocation = $state('');
	let newClient = $state('');
	let newStartDate = $state('');
	let newEndDate = $state('');
	let newSiteManager = $state('');
	let newProjectType = $state('');
	let newDescription = $state('');
	let selectedTender = $state('');

	// Handle tender selection
	function handleTenderChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedTender = target.value;
		const tender = tenderOpportunities.find(t => t.id === selectedTender);
		if (tender) {
			newSiteName = tender.title;
			newClient = tender.client;
			newLocation = tender.location;
			newProjectType = tender.tenderType;
		}
	}

	// Helper functions
	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function formatValue(value: number) {
		if (value >= 1000000000) {
			return `MWK ${(value / 1000000000).toFixed(1)}B`;
		} else if (value >= 1000000) {
			return `MWK ${(value / 1000000).toFixed(1)}M`;
		} else {
			return `MWK ${(value / 1000).toFixed(1)}K`;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Active':
				return 'bg-green-100 text-green-700';
			case 'Completed':
				return 'bg-blue-100 text-blue-700';
			case 'On Hold':
				return 'bg-yellow-100 text-yellow-700';
			case 'Delayed':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	async function loadTenderOptions() {
		try {
			const response = await fetch('/api/tenders');
			if (!response.ok) return;
			const payload = await response.json();
			const data = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
			tenderOpportunities = data;
		} catch (error) {
			console.error('Error loading tenders:', error);
		}
	}

	async function loadEmployeeOptions() {
		try {
			const response = await fetch('/api/employees');
			if (!response.ok) return;
			const payload = await response.json();
			const data = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
			realEmployees = data;
			siteManagers = realEmployees.map((employee) => ({
				id: String(employee.id),
				name: `${employee.firstname ?? ''} ${employee.lastname ?? ''}`.trim() || employee.employeeNumber || 'Employee'
			}));
		} catch (error) {
			console.error('Error loading employees:', error);
		}
	}

	onMount(() => {
		loadSites();
		loadTenderOptions();
		loadEmployeeOptions();
	});

	function openCreateModal() {
		showCreateModal = true;
		newSiteName = '';
		newLocation = '';
		newClient = '';
		newStartDate = '';
		newEndDate = '';
		newSiteManager = '';
		newProjectType = '';
		newDescription = '';
		selectedTender = '';
	}

	function closeCreateModal() {
		showCreateModal = false;
		newSiteName = '';
		newLocation = '';
		newClient = '';
		newStartDate = '';
		newEndDate = '';
		newSiteManager = '';
		newProjectType = '';
		newDescription = '';
		selectedTender = '';
	}

	async function handleCreateSite() {
		if (!newSiteName || !newLocation || !newClient) {
			alert('Please enter site name, location, and client');
			return;
		}

		try {
			const response = await fetch('/api/sites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newSiteName,
					location: newLocation,
					client: newClient,
					status: 'Active',
					startDate: newStartDate || new Date().toISOString().split('T')[0],
					endDate: newEndDate || null,
					progress: 0,
					siteManagerId: newSiteManager || null,
					value: selectedTender ? tenderOpportunities.find((t) => String(t.id) === String(selectedTender))?.value || 0 : 0,
					projectType: newProjectType || (selectedTender ? tenderOpportunities.find((t) => String(t.id) === String(selectedTender))?.tenderType || '' : ''),
					description: newDescription,
					tenderId: selectedTender || null,
					projectName: newSiteName
				})
			});

			if (!response.ok) {
				const result = await response.json().catch(() => ({}));
				throw new Error(result.error || 'Failed to create site');
			}

			await loadSites();
			closeCreateModal();
		} catch (error) {
			console.error('Error creating site:', error);
			alert(error instanceof Error ? error.message : 'Failed to create site');
		}
	}

	// Filter sites
	let filteredSites = $derived(sites.filter(site => {
		const matchesSearch = !searchQuery || 
			site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			site.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
			site.client.toLowerCase().includes(searchQuery.toLowerCase());
		
		const matchesStatus = !filterStatus || site.status === filterStatus;
		const matchesLocation = !filterLocation || site.location === filterLocation;
		const matchesClient = !filterClient || site.client === filterClient;
		const matchesProjectType = !filterProjectType || site.projectType === filterProjectType;

		return matchesSearch && matchesStatus && matchesLocation && matchesClient && matchesProjectType;
	}));

	let openSiteMenuId = $state<string | null>(null);

	function toggleSiteMenu(siteId: string) {
		openSiteMenuId = openSiteMenuId === siteId ? null : siteId;
	}

	function openSiteDetails(siteId: string) {
		window.location.href = `/site-management/${siteId}`;
	}

	function updateSite(site: any) {
		alert(`Update site: ${site.name}`);
		openSiteMenuId = null;
	}

	function deleteSite(site: any) {
		if (confirm(`Delete ${site.name}?`)) {
			sites = sites.filter((item) => String(item.id) !== String(site.id));
			openSiteMenuId = null;
		}
	}
</script>

<div class="p-6">
	<!-- Page Header -->
	<div class="bg-[#114a4b] text-white p-5 mb-6 shadow">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="text-lg font-semibold">Site Management</h1>
				<p class="text-xs text-white/75 mt-1">Manage construction sites and operations</p>
				<p class="text-[10px] uppercase tracking-widest text-[#a8e2de]">Site Overview</p>
				<p class="text-lg font-semibold mt-1">{sites.length} sites</p>
				<p class="text-xs text-white/75 mt-1">
					{sites.filter(s => s.status === 'Active').length} active · {sites.filter(s => s.status === 'Completed').length} completed
				</p>
			</div>
			<div class="flex justify-end">
				<button
					onclick={openCreateModal}
					class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#3bb3b0] transition-colors"
				>
					<Icon icon="mdi:plus" class="w-4 h-4" />
					<span>New Site</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Filters Section -->
	<div class="bg-white shadow p-6 mb-6">
		<div class="grid grid-cols-6 gap-4 mb-4">
			<div>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search sites..."
					class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
				/>
			</div>
			<div>
				<select
					bind:value={filterStatus}
					class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
				>
					<option value="">All Statuses</option>
					<option value="Active">Active</option>
					<option value="Completed">Completed</option>
					<option value="On Hold">On Hold</option>
					<option value="Delayed">Delayed</option>
				</select>
			</div>
			<div>
				<select
					bind:value={filterLocation}
					class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
				>
					<option value="">All Locations</option>
					<option value="Lilongwe">Lilongwe</option>
					<option value="Blantyre">Blantyre</option>
					<option value="Mzuzu">Mzuzu</option>
					<option value="Karonga">Karonga</option>
				</select>
			</div>
			<div>
				<select
					bind:value={filterClient}
					class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
				>
					<option value="">All Clients</option>
					<option value="Lilongwe Water Board">Lilongwe Water Board</option>
					<option value="Ministry of Transport">Ministry of Transport</option>
					<option value="Ministry of Health">Ministry of Health</option>
					<option value="Ministry of Education">Ministry of Education</option>
				</select>
			</div>
			<div>
				<select
					bind:value={filterProjectType}
					class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
				>
					<option value="">All Types</option>
					<option value="Infrastructure">Infrastructure</option>
					<option value="Construction">Construction</option>
					<option value="Renovation">Renovation</option>
				</select>
			</div>
			<div>
				<button
					onclick={() => {
						searchQuery = '';
						filterStatus = '';
						filterLocation = '';
						filterClient = '';
						filterProjectType = '';
					}}
					class="w-full px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors"
				>
					Clear Filters
				</button>
			</div>
		</div>

		<!-- Sites Table -->
		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-gray-200">
						<th class="text-left py-3 px-4 font-medium text-gray-600">Site Name</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">Location</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">Client</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">Status</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">Start Date</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">End Date</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">Progress</th>
						<th class="text-left py-3 px-4 font-medium text-gray-600">Site Manager</th>
						<th class="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredSites as site}
						<tr class="border-b border-gray-100 hover:bg-gray-50">
							<td class="py-3 px-4 font-medium text-gray-800 cursor-pointer" onclick={() => openSiteDetails(String(site.id))}>{site.name}</td>
							<td class="py-3 px-4 text-gray-600">{site.location}</td>
							<td class="py-3 px-4 text-gray-600">{site.client}</td>
							<td class="py-3 px-4">
								<span class="px-2 py-1 rounded {getStatusColor(site.status)}">{site.status}</span>
							</td>
							<td class="py-3 px-4 text-gray-600">{formatDate(site.startDate)}</td>
							<td class="py-3 px-4 text-gray-600">{formatDate(site.endDate)}</td>
							<td class="py-3 px-4">
								<div class="flex items-center gap-2">
									<div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
										<div class="h-full bg-[#5fc5c0]" style="width: {site.progress}%"></div>
									</div>
									<span class="text-gray-600">{site.progress}%</span>
								</div>
							</td>
							<td class="py-3 px-4 text-gray-600">{site.siteManager}</td>
							<td class="py-3 px-4 text-right">
								<div class="relative inline-block">
									<button
										type="button"
										class="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600"
										onclick={(event) => {
											event.stopPropagation();
											toggleSiteMenu(String(site.id));
										}}
									>
										<Icon icon="mdi:dots-vertical" class="w-4 h-4" />
									</button>

									{#if openSiteMenuId === String(site.id)}
										<div class="absolute right-0 top-full mt-2 z-20 w-36 bg-white border border-gray-200 shadow-lg">
											<button
												type="button"
												class="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
												onclick={(event) => {
													event.stopPropagation();
													updateSite(site);
												}}
											>
												Update
											</button>
											<button
												type="button"
												class="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
												onclick={(event) => {
													event.stopPropagation();
													deleteSite(site);
												}}
											>
												Delete
											</button>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Create Site Modal -->
	{#if showCreateModal}
		<div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div class="bg-white p-6 max-w-2xl w-full mx-4 shadow-xl rounded-lg">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-sm font-bold text-gray-800">New Site</h2>
					<button onclick={closeCreateModal} class="text-gray-500 hover:text-gray-700">
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="col-span-2">
						<label for="tenderSelect" class="block text-xs font-medium text-gray-700 mb-1">Select Tender *</label>
						<select
							id="tenderSelect"
							bind:value={selectedTender}
							onchange={handleTenderChange}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">Select a tender to create site</option>
							{#each tenderOpportunities as tender}
								<option value={tender.id}>{tender.title} - {tender.client}</option>
							{/each}
						</select>
					</div>
					<div class="col-span-2">
						<label for="siteName" class="block text-xs font-medium text-gray-700 mb-1">Project / Site Name *</label>
						<input
							id="siteName"
							type="text"
							bind:value={newSiteName}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Type project name or use selected bid"
						/>
					</div>
					<div>
						<label for="location" class="block text-xs font-medium text-gray-700 mb-1">Location *</label>
						<input
							id="location"
							type="text"
							bind:value={newLocation}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="e.g., Lilongwe"
						/>
					</div>
					<div>
						<label for="client" class="block text-xs font-medium text-gray-700 mb-1">Client *</label>
						<input
							id="client"
							type="text"
							bind:value={newClient}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="e.g., Ministry of Health"
						/>
					</div>
					<div>
						<label for="projectType" class="block text-xs font-medium text-gray-700 mb-1">Project Type</label>
						<select
							id="projectType"
							bind:value={newProjectType}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">Select type</option>
							<option value="Infrastructure">Infrastructure</option>
							<option value="Construction">Construction</option>
							<option value="Renovation">Renovation</option>
						</select>
					</div>
					<div>
						<label for="startDate" class="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
						<input
							id="startDate"
							type="date"
							bind:value={newStartDate}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						/>
					</div>
					<div>
						<label for="endDate" class="block text-xs font-medium text-gray-700 mb-1">End Date</label>
						<input
							id="endDate"
							type="date"
							bind:value={newEndDate}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						/>
					</div>
					<div>
						<label for="siteManager" class="block text-xs font-medium text-gray-700 mb-1">Site Manager</label>
						<select
							id="siteManager"
							bind:value={newSiteManager}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">Select site manager</option>
							{#each siteManagers as manager}
								<option value={manager.id}>{manager.name}</option>
							{/each}
						</select>
					</div>
					<div class="col-span-2">
						<label for="description" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
						<textarea
							id="description"
							bind:value={newDescription}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							rows="3"
							placeholder="Brief description of the project"
						></textarea>
					</div>
				</div>

				<div class="flex justify-end gap-2 mt-6">
					<button
						onclick={closeCreateModal}
						class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleCreateSite}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Create Site
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

