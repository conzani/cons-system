<script lang="ts">
	import Icon from '@iconify/svelte';

	// Sample data for tender opportunities - same structure as details page
	let tenderOpportunities = $state([
		{
			id: '1',
			title: 'Construction of School Block',
			client: 'Ministry of Education',
			closingDate: '2026-08-25',
			status: 'In Preparation',
			bidManager: 'John Banda',
			value: 450000000,
			progress: 65,
			tenderNumber: 'MED/CON/2026/015',
			tenderType: 'Construction',
			source: 'Public Procurement',
			description: 'Construction of a 2-story school block with 12 classrooms, offices, and sanitary facilities.',
			location: 'Lusaka',
			submissionDate: '2026-08-25'
		},
		{
			id: '2',
			title: 'Road Rehabilitation Project',
			client: 'ABC Ltd',
			closingDate: '2026-09-02',
			status: 'New',
			bidManager: 'Peter Phiri',
			value: 1200000000,
			progress: 10,
			tenderNumber: 'ROAD/2026/008',
			tenderType: 'Infrastructure',
			source: 'Direct Invitation',
			description: 'Rehabilitation of 50km of paved road including drainage systems and road markings.',
			location: 'Copperbelt',
			submissionDate: '2026-09-02'
		},
		{
			id: '3',
			title: 'Office Renovation',
			client: 'XYZ Industries',
			closingDate: '2026-08-30',
			status: 'Submitted',
			bidManager: 'Mary Chirwa',
			value: 85000000,
			progress: 90,
			tenderNumber: 'REN/2026/003',
			tenderType: 'Renovation',
			source: 'Private Tender',
			description: 'Complete renovation of office building including electrical, plumbing, and interior finishes.',
			location: 'Kitwe',
			submissionDate: '2026-08-30'
		},
		{
			id: '4',
			title: 'Water Supply System',
			client: 'Water Board',
			closingDate: '2026-09-15',
			status: 'Under Evaluation',
			bidManager: 'James Zulu',
			value: 250000000,
			progress: 100,
			tenderNumber: 'WAT/2026/012',
			tenderType: 'Infrastructure',
			source: 'Public Procurement',
			description: 'Installation of water supply system including pumps, pipelines, and storage tanks.',
			location: 'Livingstone',
			submissionDate: '2026-09-15'
		},
		{
			id: '5',
			title: 'Hospital Construction',
			client: 'Ministry of Health',
			closingDate: '2026-10-01',
			status: 'Qualified',
			bidManager: 'John Banda',
			value: 850000000,
			progress: 30,
			tenderNumber: 'HLTH/CON/2026/007',
			tenderType: 'Construction',
			source: 'Public Procurement',
			description: 'Construction of a 100-bed hospital with operating theaters, laboratories, and administrative offices.',
			location: 'Ndola',
			submissionDate: '2026-10-01'
		}
	]);

	let showCreateModal = $state(false);
	let searchQuery = $state('');
	let filterStatus = $state('');
	let filterClient = $state('');
	let filterClosingDate = $state('');
	let filterBidManager = $state('');
	let filterTenderType = $state('');
	let filterValue = $state('');

	// Form state
	let newTenderTitle = $state('');
	let newClientName = $state('');
	let newClosingDate = $state('');
	let newTenderNumber = $state('');
	let newEstimatedValue = $state('');
	let newTenderFile = $state<FileList | null>(null);
	let isCreating = $state(false);

	function openCreateModal() {
		showCreateModal = true;
		newTenderTitle = '';
		newClientName = '';
		newClosingDate = '';
		newTenderNumber = '';
		newEstimatedValue = '';
		newTenderFile = null;
	}

	function closeCreateModal() {
		showCreateModal = false;
		newTenderTitle = '';
		newClientName = '';
		newClosingDate = '';
		newTenderNumber = '';
		newEstimatedValue = '';
		newTenderFile = null;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'New':
				return 'bg-blue-100 text-blue-700';
			case 'Qualified':
				return 'bg-green-100 text-green-700';
			case 'Not Qualified':
				return 'bg-red-100 text-red-700';
			case 'In Preparation':
				return 'bg-yellow-100 text-yellow-700';
			case 'Submitted':
				return 'bg-purple-100 text-purple-700';
			case 'Under Evaluation':
				return 'bg-indigo-100 text-indigo-700';
			case 'Awarded':
				return 'bg-emerald-100 text-emerald-700';
			case 'Lost':
				return 'bg-gray-100 text-gray-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function formatValue(value: number) {
		if (value >= 1000000000) {
			return `MWK ${(value / 1000000000).toFixed(1)}B`;
		} else if (value >= 1000000) {
			return `MWK ${(value / 1000000).toFixed(0)}M`;
		} else {
			return `MWK ${(value / 1000).toFixed(0)}K`;
		}
	}

	async function handleCreateTender() {
		if (!newTenderTitle || !newClientName || !newClosingDate) {
			alert('Please fill in all required fields');
			return;
		}

		try {
			isCreating = true;
			const newTender = {
				id: String(tenderOpportunities.length + 1),
				title: newTenderTitle,
				client: newClientName,
				closingDate: newClosingDate,
				status: 'New',
				bidManager: 'John Banda',
				value: parseFloat(newEstimatedValue) || 0,
				progress: 0,
				tenderNumber: newTenderNumber || 'TBD',
				tenderType: 'General',
				source: 'Manual Entry',
				description: '',
				location: '',
				submissionDate: newClosingDate
			};

			tenderOpportunities = [newTender, ...tenderOpportunities];
			closeCreateModal();
		} catch (error) {
			console.error('Error creating tender:', error);
			alert('Failed to create tender');
		} finally {
			isCreating = false;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const filteredTenders = $derived(tenderOpportunities.filter((tender: any) => {
		const matchesSearch = !searchQuery ||
			tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tender.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
			tender.tenderNumber.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus = !filterStatus || tender.status === filterStatus;
		const matchesClient = !filterClient || tender.client.toLowerCase().includes(filterClient.toLowerCase());
		const matchesBidManager = !filterBidManager || tender.bidManager.toLowerCase().includes(filterBidManager.toLowerCase());
		const matchesTenderType = !filterTenderType || tender.tenderType === filterTenderType;

		return matchesSearch && matchesStatus && matchesClient && matchesBidManager && matchesTenderType;
	}));

	const uniqueClients = $derived([...new Set(tenderOpportunities.map(t => t.client))]);
	const uniqueBidManagers = $derived([...new Set(tenderOpportunities.map(t => t.bidManager))]);
	const uniqueTenderTypes = $derived([...new Set(tenderOpportunities.map(t => t.tenderType))]);
</script>

<div class="p-6">
	<h1 class="text-sm font-bold text-gray-800 mb-6">Tender and Bid Management</h1>

	<div class="bg-white shadow p-6">
		<!-- Header with Actions -->
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-xs font-semibold text-gray-700">Tenders</h2>
			<div class="flex gap-2">
				<button class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">
					<Icon icon="mdi:download" class="w-4 h-4" />
					<span>Import</span>
				</button>
				<button class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">
					<Icon icon="mdi:upload" class="w-4 h-4" />
					<span>Export</span>
				</button>
				<button
					onclick={openCreateModal}
					class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
				>
					<Icon icon="mdi:plus" class="w-4 h-4" />
					<span>New Tender</span>
				</button>
			</div>
		</div>

		<!-- Search and Filters -->
		<div class="mb-4 p-4 bg-gray-50 border border-gray-200">
			<div class="flex gap-4 mb-3">
				<div class="flex-1">
					<label for="searchQuery" class="block text-[10px] font-medium text-gray-700 mb-1">Search</label>
					<input
						id="searchQuery"
						type="text"
						bind:value={searchQuery}
						placeholder="Search by title, client, or tender number..."
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					/>
				</div>
			</div>

			<div class="grid grid-cols-5 gap-4">
				<div>
					<label for="filterStatus" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
					<select
						id="filterStatus"
						bind:value={filterStatus}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">All Statuses</option>
						<option value="New">New</option>
						<option value="Qualified">Qualified</option>
						<option value="Not Qualified">Not Qualified</option>
						<option value="In Preparation">In Preparation</option>
						<option value="Submitted">Submitted</option>
						<option value="Under Evaluation">Under Evaluation</option>
						<option value="Awarded">Awarded</option>
						<option value="Lost">Lost</option>
					</select>
				</div>

				<div>
					<label for="filterClient" class="block text-[10px] font-medium text-gray-700 mb-1">Client</label>
					<select
						id="filterClient"
						bind:value={filterClient}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">All Clients</option>
						{#each uniqueClients as client}
							<option value={client}>{client}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="filterBidManager" class="block text-[10px] font-medium text-gray-700 mb-1">Bid Manager</label>
					<select
						id="filterBidManager"
						bind:value={filterBidManager}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">All Managers</option>
						{#each uniqueBidManagers as manager}
							<option value={manager}>{manager}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="filterTenderType" class="block text-[10px] font-medium text-gray-700 mb-1">Tender Type</label>
					<select
						id="filterTenderType"
						bind:value={filterTenderType}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">All Types</option>
						{#each uniqueTenderTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-end">
					<button
						onclick={() => { searchQuery = ''; filterStatus = ''; filterClient = ''; filterBidManager = ''; filterTenderType = ''; }}
						class="px-3 py-2 text-xs text-gray-700 hover:bg-gray-200 transition-colors w-full"
					>
						Clear Filters
					</button>
				</div>
			</div>
		</div>

		<!-- Tenders Table -->
		{#if filteredTenders.length === 0}
			<p class="text-xs text-gray-500">No tenders found.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tender</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Client</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Closing Date</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Bid Manager</th>
							<th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">Value</th>
							<th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">Progress</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTenders as tender}
							<tr class="border-t border-gray-200 hover:bg-gray-50 cursor-pointer" onclick={() => window.location.href = `/bidding/${tender.id}`}>
								<td class="px-4 py-3">
									<div>
										<p class="text-xs font-medium text-gray-800">{tender.title}</p>
										<p class="text-[10px] text-gray-500">{tender.tenderNumber}</p>
									</div>
								</td>
								<td class="px-4 py-3 text-xs text-gray-600">{tender.client}</td>
								<td class="px-4 py-3 text-xs text-gray-600">{formatDate(tender.closingDate)}</td>
								<td class="px-4 py-3">
									<span class="text-[10px] px-2 py-1 rounded {getStatusColor(tender.status)}">{tender.status}</span>
								</td>
								<td class="px-4 py-3 text-xs text-gray-600">{tender.bidManager}</td>
								<td class="px-4 py-3 text-xs text-gray-600 text-right">{formatValue(tender.value)}</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<div class="flex-1 bg-gray-200 rounded-full h-2">
											<div class="bg-[#5fc5c0] h-2 rounded-full" style="width: {tender.progress}%"></div>
										</div>
										<span class="text-[10px] text-gray-600">{tender.progress}%</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<a
										href={`/bidding/${tender.id}`}
										class="text-[#5fc5c0] hover:text-[#114a4b] text-xs font-medium"
										onclick={(e) => e.stopPropagation()}
									>
										View
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Create Tender Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-2xl w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">New Tender Opportunity</h2>
				<button onclick={closeCreateModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="tenderTitle" class="block text-xs font-medium text-gray-700 mb-1">Tender Title *</label>
					<input
						id="tenderTitle"
						type="text"
						bind:value={newTenderTitle}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter tender title"
					/>
				</div>

				<div>
					<label for="clientName" class="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
					<input
						id="clientName"
						type="text"
						bind:value={newClientName}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter client name"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="tenderNumber" class="block text-xs font-medium text-gray-700 mb-1">Tender Number</label>
						<input
							id="tenderNumber"
							type="text"
							bind:value={newTenderNumber}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="e.g., MED/CON/2026/015"
						/>
					</div>

					<div>
						<label for="closingDate" class="block text-xs font-medium text-gray-700 mb-1">Closing Date *</label>
						<input
							id="closingDate"
							type="date"
							bind:value={newClosingDate}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						/>
					</div>
				</div>

				<div>
					<label for="estimatedValue" class="block text-xs font-medium text-gray-700 mb-1">Estimated Value (MWK)</label>
					<input
						id="estimatedValue"
						type="number"
						bind:value={newEstimatedValue}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter estimated value"
					/>
				</div>

				<div>
					<label for="tenderFile" class="block text-xs font-medium text-gray-700 mb-1">Tender Document</label>
					<input
						id="tenderFile"
						type="file"
						bind:files={newTenderFile}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					/>
					<p class="text-[10px] text-gray-500 mt-1">Upload tender notice or document (optional)</p>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeCreateModal}
						disabled={isCreating}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleCreateTender}
						disabled={isCreating}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isCreating ? 'Creating...' : 'Create Tender'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
