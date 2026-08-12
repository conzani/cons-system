<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';

	// Get tender ID from URL
	const tenderId = $page.params.id;

	// Sample tender data - in production this would come from an API
	const allTenders = [
		{
			id: '1',
			title: 'Construction of School Block',
			client: 'Ministry of Education',
			tenderNumber: 'MED/CON/2026/015',
			closingDate: '2026-08-25',
			estimatedValue: 450000000,
			status: 'In Preparation',
			progress: 65,
			bidManager: 'John Banda',
			tenderType: 'Construction',
			source: 'Public Procurement',
			projectLocation: 'Lilongwe, Malawi',
			description: 'Construction of a 3-story school block with 12 classrooms, 2 science labs, and administrative offices.'
		},
		{
			id: '2',
			title: 'Road Rehabilitation Project',
			client: 'ABC Ltd',
			tenderNumber: 'ROAD/2026/008',
			closingDate: '2026-09-02',
			estimatedValue: 1200000000,
			status: 'New',
			progress: 10,
			bidManager: 'Peter Phiri',
			tenderType: 'Infrastructure',
			source: 'Direct Invitation',
			projectLocation: 'Blantyre, Malawi',
			description: 'Rehabilitation of 50km of road including resurfacing and drainage improvements.'
		},
		{
			id: '3',
			title: 'Office Renovation',
			client: 'XYZ Industries',
			tenderNumber: 'REN/2026/003',
			closingDate: '2026-08-30',
			estimatedValue: 85000000,
			status: 'Submitted',
			progress: 90,
			bidManager: 'Mary Chirwa',
			tenderType: 'Renovation',
			source: 'Public Procurement',
			projectLocation: 'Lilongwe, Malawi',
			description: 'Complete renovation of office building including interior and exterior work.'
		},
		{
			id: '4',
			title: 'Water Supply System',
			client: 'Water Board',
			tenderNumber: 'WAT/2026/012',
			closingDate: '2026-09-15',
			estimatedValue: 250000000,
			status: 'Under Evaluation',
			progress: 100,
			bidManager: 'James Zulu',
			tenderType: 'Infrastructure',
			source: 'Public Procurement',
			projectLocation: 'Mzuzu, Malawi',
			description: 'Installation of water supply system for residential area including piping and treatment plant.'
		},
		{
			id: '5',
			title: 'Hospital Construction',
			client: 'Ministry of Health',
			tenderNumber: 'HLTH/CON/2026/007',
			closingDate: '2026-10-01',
			estimatedValue: 850000000,
			status: 'Qualified',
			progress: 30,
			bidManager: 'John Banda',
			tenderType: 'Construction',
			source: 'Public Procurement',
			projectLocation: 'Zomba, Malawi',
			description: 'Construction of a 200-bed hospital with operating theaters and diagnostic facilities.'
		}
	];

	// Load the specific tender based on ID
	let tender = $state(allTenders.find(t => t.id === tenderId) || allTenders[0]);

	// Workflow stages
	let workflowStages = $state([
		{ id: 'opportunity', name: 'Opportunity', status: 'completed', completedDate: '2026-08-01' },
		{ id: 'qualification', name: 'Qualification', status: 'completed', completedDate: '2026-08-02' },
		{ id: 'bidDecision', name: 'Bid/No-Bid', status: 'completed', completedDate: '2026-08-03' },
		{ id: 'preparation', name: 'Preparation', status: 'inProgress', completedDate: null },
		{ id: 'pricing', name: 'Pricing', status: 'pending', completedDate: null },
		{ id: 'review', name: 'Internal Review', status: 'pending', completedDate: null },
		{ id: 'approval', name: 'Approval', status: 'pending', completedDate: null },
		{ id: 'submission', name: 'Submission', status: 'pending', completedDate: null },
		{ id: 'evaluation', name: 'Evaluation', status: 'pending', completedDate: null },
		{ id: 'award', name: 'Award', status: 'pending', completedDate: null }
	]);

	// Tabs
	let activeTab = $state('overview');
	const tabs = [
		{ id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
		{ id: 'workflow', label: 'Workflow', icon: 'mdi:progress-clock' },
		{ id: 'team', label: 'Team', icon: 'mdi:account-group' },
		{ id: 'requirements', label: 'Requirements', icon: 'mdi:clipboard-check' },
		{ id: 'documents', label: 'Documents', icon: 'mdi:folder' },
		{ id: 'boq', label: 'BOQ & Pricing', icon: 'mdi:calculator' },
		{ id: 'communication', label: 'Communication', icon: 'mdi:message-text' },
		{ id: 'approvals', label: 'Approvals', icon: 'mdi:check-circle' },
		{ id: 'submission', label: 'Submission', icon: 'mdi:send' },
		{ id: 'evaluation', label: 'Evaluation', icon: 'mdi:gavel' },
		{ id: 'award', label: 'Award', icon: 'mdi:trophy' },
		{ id: 'activity', label: 'Activity', icon: 'mdi:history' }
	];

	// Sample data for different tabs
	let teamMembers = $state([
		{ id: '1', name: 'John Banda', role: 'Bid Manager', responsibility: 'Overall Bid Coordination', status: 'Active' },
		{ id: '2', name: 'Peter Phiri', role: 'Quantity Surveyor', responsibility: 'BOQ & Pricing', status: 'Active' },
		{ id: '3', name: 'Mary Chirwa', role: 'Engineer', responsibility: 'Technical Proposal', status: 'Active' },
		{ id: '4', name: 'James Zulu', role: 'Finance Manager', responsibility: 'Financial Documents', status: 'Active' }
	]);

	let requirements = $state([
		{ id: '1', category: 'Administrative', name: 'Certificate of Incorporation', status: 'complete', mandatory: true, responsible: 'John Banda' },
		{ id: '2', category: 'Administrative', name: 'Tax Clearance Certificate', status: 'complete', mandatory: true, responsible: 'John Banda' },
		{ id: '3', category: 'Administrative', name: 'Company Profile', status: 'complete', mandatory: true, responsible: 'John Banda' },
		{ id: '4', category: 'Technical', name: 'Similar Projects Experience', status: 'complete', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '5', category: 'Technical', name: 'Key Personnel CVs', status: 'complete', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '6', category: 'Technical', name: 'Equipment List', status: 'inProgress', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '7', category: 'Technical', name: 'Method Statement', status: 'pending', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '8', category: 'Financial', name: 'Audited Accounts', status: 'complete', mandatory: true, responsible: 'James Zulu' },
		{ id: '9', category: 'Financial', name: 'Bid Security', status: 'inProgress', mandatory: true, responsible: 'James Zulu' },
		{ id: '10', category: 'Financial', name: 'Bank Statement', status: 'complete', mandatory: true, responsible: 'James Zulu' }
	]);

	let documents = $state([
		{ id: '1', name: 'Tender Notice.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-01' },
		{ id: '2', name: 'Company Registration.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-02' },
		{ id: '3', name: 'Tax Clearance.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-02' },
		{ id: '4', name: 'Method Statement v2.docx', category: 'Technical', version: '2', uploadedBy: 'Mary Chirwa', uploadedDate: '2026-08-10' },
		{ id: '5', name: 'BOQ.xlsx', category: 'Financial', version: '3', uploadedBy: 'Peter Phiri', uploadedDate: '2026-08-12' }
	]);

	let activityLog = $state([
		{ id: '1', action: 'Tender created', user: 'John Banda', date: '2026-08-01T10:00:00Z', details: 'Tender opportunity registered' },
		{ id: '2', action: 'Qualification completed', user: 'John Banda', date: '2026-08-02T14:30:00Z', details: 'Company qualified to bid' },
		{ id: '3', action: 'Bid decision made', user: 'Managing Director', date: '2026-08-03T09:15:00Z', details: 'Decision: Bid' },
		{ id: '4', action: 'Team member assigned', user: 'John Banda', date: '2026-08-03T10:00:00Z', details: 'Mary Chirwa assigned as Engineer' },
		{ id: '5', action: 'Document uploaded', user: 'Mary Chirwa', date: '2026-08-10T16:45:00Z', details: 'Method Statement v2 uploaded' },
		{ id: '6', action: 'BOQ updated', user: 'Peter Phiri', date: '2026-08-12T11:20:00Z', details: 'Pricing updated to MWK 450M' }
	]);

	function getStatusColor(status: string) {
		switch (status) {
			case 'New':
				return 'bg-blue-100 text-blue-700';
			case 'Qualified':
				return 'bg-green-100 text-green-700';
			case 'In Preparation':
				return 'bg-yellow-100 text-yellow-700';
			case 'Submitted':
				return 'bg-purple-100 text-purple-700';
			case 'Under Evaluation':
				return 'bg-indigo-100 text-indigo-700';
			case 'Awarded':
				return 'bg-emerald-100 text-emerald-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getWorkflowStageColor(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-[#5fc5c0] text-white';
			case 'inProgress':
				return 'bg-[#5fc5c0] text-white ring-4 ring-[#5fc5c0]/30';
			case 'pending':
				return 'bg-gray-200 text-gray-500';
			default:
				return 'bg-gray-200 text-gray-500';
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

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatDateTime(dateString: string) {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getRequirementStatusColor(status: string) {
		switch (status) {
			case 'complete':
				return 'bg-green-100 text-green-700';
			case 'inProgress':
				return 'bg-yellow-100 text-yellow-700';
			case 'pending':
				return 'bg-gray-100 text-gray-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}
</script>

<div class="p-6">
	<!-- Tender Header -->
	<div class="bg-white shadow p-6 mb-6">
		<div class="flex items-start justify-between mb-4">
			<div>
				<h1 class="text-lg font-bold text-gray-800">{tender.title}</h1>
				<p class="text-sm text-gray-600">{tender.client}</p>
				<p class="text-xs text-gray-500 mt-1">Tender No: {tender.tenderNumber}</p>
			</div>
			<div class="flex gap-2">
				<button class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">
					<Icon icon="mdi:pencil" class="w-4 h-4" />
					<span>Edit</span>
				</button>
				<button class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">
					<Icon icon="mdi:printer" class="w-4 h-4" />
					<span>Print</span>
				</button>
			</div>
		</div>

		<div class="grid grid-cols-4 gap-4 text-xs">
			<div>
				<span class="text-gray-500">Closing Date:</span>
				<span class="ml-2 font-medium text-gray-800">{formatDate(tender.closingDate)}</span>
			</div>
			<div>
				<span class="text-gray-500">Estimated Value:</span>
				<span class="ml-2 font-medium text-gray-800">{formatValue(tender.estimatedValue)}</span>
			</div>
			<div>
				<span class="text-gray-500">Status:</span>
				<span class="ml-2 px-2 py-1 rounded {getStatusColor(tender.status)}">{tender.status}</span>
			</div>
			<div>
				<span class="text-gray-500">Progress:</span>
				<span class="ml-2 font-medium text-gray-800">{tender.progress}% Complete</span>
			</div>
		</div>
	</div>

	<!-- Workflow Stepper -->
	<div class="bg-white shadow p-6 mb-6">
		<h2 class="text-xs font-semibold text-gray-700 mb-4">Workflow Progress</h2>
		<div class="flex items-center justify-between overflow-x-auto pb-2">
			{#each workflowStages as stage, index}
				<div class="flex items-center flex-shrink-0">
					<div class="flex flex-col items-center">
						<div class="w-8 h-8 rounded-full flex items-center justify-center {getWorkflowStageColor(stage.status)} text-xs font-medium">
							{stage.status === 'completed' ? '✓' : index + 1}
						</div>
						<span class="text-[10px] mt-2 text-gray-600 whitespace-nowrap">{stage.name}</span>
						{#if stage.completedDate}
							<span class="text-[9px] text-gray-400">{formatDate(stage.completedDate)}</span>
						{/if}
					</div>
					{#if index < workflowStages.length - 1}
						<div class="w-12 h-0.5 bg-gray-200 mx-2 flex-shrink-0"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Tabs -->
	<div class="bg-white shadow">
		<div class="border-b border-gray-200">
			<nav class="flex overflow-x-auto">
				{#each tabs as tab}
					<button
						onclick={() => activeTab = tab.id}
						class="flex items-center gap-2 px-4 py-3 text-xs whitespace-nowrap border-b-2 transition-colors {activeTab === tab.id ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}"
					>
						<Icon icon={tab.icon} class="w-4 h-4" />
						<span>{tab.label}</span>
					</button>
				{/each}
			</nav>
		</div>

		<!-- Tab Content -->
		<div class="p-6">
			{#if activeTab === 'overview'}
				<!-- Overview Tab -->
				<div class="grid grid-cols-4 gap-4 mb-6">
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:calendar" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Closing Date</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatDate(tender.closingDate)}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:cash" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Bid Value</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatValue(tender.estimatedValue)}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:account-group" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Team Members</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{teamMembers.length}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:folder" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Documents</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{documents.length}</p>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4 mb-6">
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs text-gray-500">Requirements</span>
							<span class="text-xs font-semibold text-[#5fc5c0]">{requirements.filter(r => r.status === 'complete').length}/{requirements.length}</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-[#5fc5c0] h-2 rounded-full" style="width: {(requirements.filter(r => r.status === 'complete').length / requirements.length * 100)}%"></div>
						</div>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs text-gray-500">Tasks</span>
							<span class="text-xs font-semibold text-[#5fc5c0]">18/22</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-[#5fc5c0] h-2 rounded-full" style="width: 82%"></div>
						</div>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs text-gray-500">Approvals</span>
							<span class="text-xs font-semibold text-yellow-600">2/4</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-yellow-500 h-2 rounded-full" style="width: 50%"></div>
						</div>
					</div>
				</div>

				<div class="mb-6">
					<h3 class="text-xs font-semibold text-gray-700 mb-3">Recent Activity</h3>
					<div class="space-y-2">
						{#each activityLog.slice(0, 5) as activity}
							<div class="flex items-start gap-3 p-3 bg-gray-50 rounded">
								<Icon icon="mdi:clock" class="w-4 h-4 text-gray-500 mt-0.5" />
								<div class="flex-1">
									<p class="text-xs font-medium text-gray-800">{activity.action}</p>
									<p class="text-[10px] text-gray-500">{activity.details}</p>
									<p class="text-[10px] text-gray-400 mt-1">{activity.user} • {formatDateTime(activity.date)}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if activeTab === 'team'}
				<!-- Team Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Bid Team</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>Add Team Member</span>
						</button>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
									<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Role</th>
									<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Responsibility</th>
									<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
									<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each teamMembers as member}
									<tr class="border-t border-gray-200">
										<td class="px-4 py-3 text-xs text-gray-800">{member.name}</td>
										<td class="px-4 py-3 text-xs text-gray-600">{member.role}</td>
										<td class="px-4 py-3 text-xs text-gray-600">{member.responsibility}</td>
										<td class="px-4 py-3">
											<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">{member.status}</span>
										</td>
										<td class="px-4 py-3">
											<button class="text-gray-500 hover:text-gray-700">
												<Icon icon="mdi:pencil" class="w-4 h-4" />
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{:else if activeTab === 'requirements'}
				<!-- Requirements Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Requirements Checklist</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>Add Requirement</span>
						</button>
					</div>
					<div class="space-y-4">
						{#each ['Administrative', 'Technical', 'Financial'] as category}
							<div>
								<h4 class="text-xs font-medium text-gray-700 mb-2">{category}</h4>
								<div class="space-y-2">
									{#each requirements.filter(r => r.category === category) as req}
										<div class="flex items-center justify-between p-3 bg-gray-50 rounded">
											<div class="flex items-center gap-3">
												<div class="w-5 h-5 rounded flex items-center justify-center {req.status === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
													{req.status === 'complete' ? '✓' : ''}
												</div>
												<div>
													<p class="text-xs font-medium text-gray-800">{req.name}</p>
													<p class="text-[10px] text-gray-500">Responsible: {req.responsible}</p>
												</div>
											</div>
											<div class="flex items-center gap-2">
												{#if req.mandatory}
													<span class="text-[9px] px-1 py-0.5 bg-red-100 text-red-700 rounded">Mandatory</span>
												{/if}
												<span class="text-[10px] px-2 py-1 rounded {getRequirementStatusColor(req.status)}">{req.status}</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if activeTab === 'documents'}
				<!-- Documents Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Tender Documents</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:upload" class="w-4 h-4" />
							<span>Upload Document</span>
						</button>
					</div>
					<div class="space-y-2">
						{#each documents as doc}
							<div class="flex items-center justify-between p-3 bg-gray-50 rounded">
								<div class="flex items-center gap-3">
									<Icon icon="mdi:file-documentOutline" class="w-5 h-5 text-gray-600" />
									<div>
										<p class="text-xs font-medium text-gray-800">{doc.name}</p>
										<p class="text-[10px] text-gray-500">{doc.category} • v{doc.version}</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-[10px] text-gray-500">{doc.uploadedBy}</span>
									<span class="text-[10px] text-gray-400">{formatDate(doc.uploadedDate)}</span>
									<button class="text-gray-500 hover:text-gray-700">
										<Icon icon="mdi:download" class="w-4 h-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if activeTab === 'boq'}
				<!-- BOQ & Pricing Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">BOQ & Pricing</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:upload" class="w-4 h-4" />
							<span>Import BOQ</span>
						</button>
					</div>
					<div class="text-center py-12">
						<Icon icon="mdi:calculator" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<p class="text-sm text-gray-500">BOQ & Pricing module</p>
						<p class="text-xs text-gray-400">Coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'workflow'}
				<!-- Workflow Tab -->
				<div>
					<h3 class="text-xs font-semibold text-gray-700 mb-4">Workflow Stages</h3>
					<div class="space-y-4">
						{#each workflowStages as stage}
							<div class="p-4 border border-gray-200 rounded">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center gap-2">
										<div class="w-6 h-6 rounded-full flex items-center justify-center {getWorkflowStageColor(stage.status)} text-[10px] font-medium">
											{stage.status === 'completed' ? '✓' : stage.status === 'inProgress' ? '●' : '○'}
										</div>
										<span class="text-xs font-medium text-gray-800">{stage.name}</span>
									</div>
									<span class="text-[10px] px-2 py-1 rounded {getWorkflowStageColor(stage.status)}">{stage.status}</span>
								</div>
								{#if stage.completedDate}
									<p class="text-[10px] text-gray-500">Completed: {formatDate(stage.completedDate)}</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{:else if activeTab === 'communication'}
				<!-- Communication Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Communication & Clarifications</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>New Message</span>
						</button>
					</div>
					<div class="text-center py-12">
						<Icon icon="mdi:message-text" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<p class="text-sm text-gray-500">Communication module</p>
						<p class="text-xs text-gray-400">Coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'approvals'}
				<!-- Approvals Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Approvals</h3>
					</div>
					<div class="text-center py-12">
						<Icon icon="mdi:check-circle" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<p class="text-sm text-gray-500">Approvals module</p>
						<p class="text-xs text-gray-400">Coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'submission'}
				<!-- Submission Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Submission</h3>
					</div>
					<div class="text-center py-12">
						<Icon icon="mdi:send" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<p class="text-sm text-gray-500">Submission module</p>
						<p class="text-xs text-gray-400">Coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'evaluation'}
				<!-- Evaluation Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Evaluation</h3>
					</div>
					<div class="text-center py-12">
						<Icon icon="mdi:gavel" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<p class="text-sm text-gray-500">Evaluation module</p>
						<p class="text-xs text-gray-400">Coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'award'}
				<!-- Award Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Award</h3>
					</div>
					<div class="text-center py-12">
						<Icon icon="mdi:trophy" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<p class="text-sm text-gray-500">Award module</p>
						<p class="text-xs text-gray-400">Coming soon</p>
					</div>
				</div>
			{:else if activeTab === 'activity'}
				<!-- Activity Tab -->
				<div>
					<h3 class="text-xs font-semibold text-gray-700 mb-4">Activity Timeline</h3>
					<div class="space-y-3">
						{#each activityLog as activity}
							<div class="flex items-start gap-3 p-3 bg-gray-50 rounded">
								<Icon icon="mdi:clock" class="w-4 h-4 text-gray-500 mt-0.5" />
								<div class="flex-1">
									<p class="text-xs font-medium text-gray-800">{activity.action}</p>
									<p class="text-[10px] text-gray-500">{activity.details}</p>
									<p class="text-[10px] text-gray-400 mt-1">{activity.user} • {formatDateTime(activity.date)}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
