<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';

	// Get site ID from URL
	let siteId = $derived($page.params.id);

	// Sample sites data
	let allSites = $state([
		{
			id: '1',
			name: 'Lilongwe Water Project',
			location: 'Lilongwe',
			client: 'Lilongwe Water Board',
			status: 'Active',
			startDate: '2026-01-15',
			endDate: '2026-12-31',
			progress: 65,
			siteManager: 'John Banda',
			value: 450000000,
			projectType: 'Infrastructure',
			description: 'Construction of water supply system including pumps, pipelines, and storage tanks.'
		},
		{
			id: '2',
			name: 'Blantyre Road Construction',
			location: 'Blantyre',
			client: 'Ministry of Transport',
			status: 'Active',
			startDate: '2026-03-01',
			endDate: '2027-02-28',
			progress: 40,
			siteManager: 'Peter Phiri',
			value: 1200000000,
			projectType: 'Infrastructure',
			description: 'Rehabilitation of 50km of paved road including drainage systems and road markings.'
		},
		{
			id: '3',
			name: 'Mzuzu Hospital Extension',
			location: 'Mzuzu',
			client: 'Ministry of Health',
			status: 'On Hold',
			startDate: '2026-02-10',
			endDate: '2026-12-15',
			progress: 25,
			siteManager: 'Mary Chirwa',
			value: 850000000,
			projectType: 'Construction',
			description: 'Construction of a 100-bed hospital extension with operating theaters and laboratories.'
		},
		{
			id: '4',
			name: 'Karonga School Complex',
			location: 'Karonga',
			client: 'Ministry of Education',
			status: 'Completed',
			startDate: '2025-09-01',
			endDate: '2026-06-30',
			progress: 100,
			siteManager: 'James Zulu',
			value: 320000000,
			projectType: 'Construction',
			description: 'Construction of school complex with classrooms, offices, and sanitary facilities.'
		}
	]);

	// Load the specific site based on ID
	let site = $state(allSites.find(s => s.id === siteId) || {
		id: '1',
		name: 'Lilongwe Water Project',
		location: 'Lilongwe',
		client: 'Lilongwe Water Board',
		status: 'Active',
		startDate: '2026-01-15',
		endDate: '2026-12-31',
		progress: 65,
		siteManager: 'John Banda',
		value: 450000000,
		projectType: 'Infrastructure',
		description: 'Construction of water supply system including pumps, pipelines, and storage tanks.'
	});

	// Tabs
	let activeTab = $state('overview');
	const tabs = [
		{ id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
		{ id: 'attendance', label: 'Site Attendance', icon: 'mdi:clipboard-account' },
		{ id: 'documents', label: 'Site Documents', icon: 'mdi:folder-multiple' },
		{ id: 'reports', label: 'Reports', icon: 'mdi:file-chart' },
		{ id: 'communication', label: 'Communication', icon: 'mdi:message-text' },
		{ id: 'team', label: 'Team', icon: 'mdi:account-group' },
		{ id: 'management', label: 'Management', icon: 'mdi:cog' }
	];

	// Sample data for different tabs
	let engineers = $state([
		{ id: '1', name: 'Mary Chirwa', site: 'Lilongwe Water Project', specialization: 'Civil Engineering', phone: '+265 991 234 567', status: 'Active' },
		{ id: '2', name: 'Peter Phiri', site: 'Blantyre Road Construction', specialization: 'Structural Engineering', phone: '+265 992 345 678', status: 'Active' },
		{ id: '3', name: 'Sarah Mwale', site: 'Mzuzu Hospital Extension', specialization: 'Mechanical Engineering', phone: '+265 993 456 789', status: 'On Leave' }
	]);

	let supervisors = $state([
		{ id: '1', name: 'John Banda', site: 'Lilongwe Water Project', shift: 'Day', phone: '+265 994 567 890', status: 'Active' },
		{ id: '2', name: 'James Zulu', site: 'Blantyre Road Construction', shift: 'Night', phone: '+265 995 678 901', status: 'Active' },
		{ id: '3', name: 'David Kachere', site: 'Karonga School Complex', shift: 'Day', phone: '+265 996 789 012', status: 'Completed' }
	]);

	let visitors = $state([
		{ id: '1', name: 'Dr. Michael Phiri', organization: 'Ministry of Health', purpose: 'Site Inspection', date: '2026-08-14', phone: '+265 977 123 456', status: 'Completed' },
		{ id: '2', name: 'Ms. Sarah Banda', organization: 'Lilongwe Water Board', purpose: 'Progress Review', date: '2026-08-13', phone: '+265 988 234 567', status: 'Completed' },
		{ id: '3', name: 'Mr. Peter Mwale', organization: 'Engineering Consultants', purpose: 'Technical Assessment', date: '2026-08-12', phone: '+265 999 345 678', status: 'Completed' }
	]);

	let issues = $state([
		{ id: '1', title: 'Equipment malfunction', site: 'Mzuzu Hospital Extension', priority: 'High', status: 'Open', date: '2026-08-12', description: 'Excavator hydraulic system failure' },
		{ id: '2', title: 'Material delay', site: 'Blantyre Road Construction', priority: 'Medium', status: 'In Progress', date: '2026-08-13', description: 'Cement delivery delayed by supplier' },
		{ id: '3', title: 'Weather impact', site: 'Lilongwe Water Project', priority: 'Low', status: 'Resolved', date: '2026-08-11', description: 'Heavy rain caused minor flooding' }
	]);

	let requests = $state([
		{ id: '1', title: 'Additional equipment', site: 'Lilongwe Water Project', type: 'Equipment', status: 'Pending', date: '2026-08-14', description: 'Request for additional crane for lifting operations' },
		{ id: '2', title: 'Budget adjustment', site: 'Blantyre Road Construction', type: 'Financial', status: 'Approved', date: '2026-08-13', description: 'Request for additional budget due to material cost increase' },
		{ id: '3', title: 'Schedule extension', site: 'Karonga School Complex', type: 'Schedule', status: 'Pending', date: '2026-08-12', description: 'Request for 2-week extension due to delays' }
	]);

	let checklist = $state([
		{ id: '1', item: 'Site survey completed', site: 'Lilongwe Water Project', category: 'Planning', status: 'Completed', date: '2026-01-20' },
		{ id: '2', item: 'Safety inspection', site: 'Blantyre Road Construction', category: 'Safety', status: 'Completed', date: '2026-02-15' },
		{ id: '3', item: 'Environmental assessment', site: 'Mzuzu Hospital Extension', category: 'Compliance', status: 'In Progress', date: '2026-08-14' },
		{ id: '4', item: 'Equipment maintenance', site: 'Lilongwe Water Project', category: 'Maintenance', status: 'Pending', date: '2026-08-15' }
	]);

	let sitePhotos = $state([
		{ id: '1', name: 'Site overview - Aug 14', site: 'Lilongwe Water Project', date: '2026-08-14', uploadedBy: 'John Banda', size: '2.4 MB' },
		{ id: '2', name: 'Foundation progress', site: 'Blantyre Road Construction', date: '2026-08-13', uploadedBy: 'James Zulu', size: '1.8 MB' },
		{ id: '3', name: 'Equipment setup', site: 'Mzuzu Hospital Extension', date: '2026-08-12', uploadedBy: 'Sarah Mwale', size: '3.1 MB' }
	]);

	let siteVideos = $state([
		{ id: '1', name: 'Site walkthrough - Week 32', site: 'Lilongwe Water Project', date: '2026-08-14', uploadedBy: 'John Banda', duration: '5:30', size: '45 MB' },
		{ id: '2', name: 'Safety briefing', site: 'Blantyre Road Construction', date: '2026-08-13', uploadedBy: 'James Zulu', duration: '12:15', size: '98 MB' }
	]);

	let siteDocuments = $state([
		{ id: '1', name: 'Site plan v2.3', site: 'Lilongwe Water Project', category: 'Plans', date: '2026-08-14', uploadedBy: 'John Banda', size: '1.2 MB' },
		{ id: '2', name: 'Safety report - August', site: 'Blantyre Road Construction', category: 'Reports', date: '2026-08-13', uploadedBy: 'James Zulu', size: '0.8 MB' },
		{ id: '3', name: 'Material inventory', site: 'Mzuzu Hospital Extension', category: 'Inventory', date: '2026-08-12', uploadedBy: 'Sarah Mwale', size: '0.5 MB' }
	]);

	let communications = $state([
		{ id: '1', subject: 'Site safety inspection results', sender: 'John Banda', date: '2026-08-14T10:30:00Z', message: 'Safety inspection completed with no major issues. Minor recommendations for equipment storage.', status: 'Read' },
		{ id: '2', subject: 'Material delivery delay notification', sender: 'Peter Phiri', date: '2026-08-13T14:15:00Z', message: 'Cement delivery delayed by 2 days due to supplier logistics. Adjusting schedule accordingly.', status: 'Read' },
		{ id: '3', subject: 'Weekly progress update', sender: 'Mary Chirwa', date: '2026-08-12T09:00:00Z', message: 'Excavation work 50% complete. On track for next milestone.', status: 'Read' }
	]);

	// Construction roles for team members
	let constructionRoles = $state([
		{ id: 'senior_engineer', name: 'Senior Engineer', category: 'Engineering' },
		{ id: 'site_engineer', name: 'Site Engineer', category: 'Engineering' },
		{ id: 'supervisor', name: 'Supervisor (Foreman)', category: 'Supervision' },
		{ id: 'builder', name: 'Builder', category: 'Construction' },
		{ id: 'environmental', name: 'Environmental Officer', category: 'Compliance' },
		{ id: 'safety', name: 'Safety Officer', category: 'Safety' },
		{ id: 'electrician', name: 'Electrician', category: 'Technical' },
		{ id: 'plumber', name: 'Plumber', category: 'Technical' },
		{ id: 'surveyor', name: 'Surveyor', category: 'Technical' },
		{ id: 'architect', name: 'Architect', category: 'Design' }
	]);

	// Team member modal state
	let showTeamMemberModal = $state(false);
	let newMemberName = $state('');
	let newMemberRole = $state('');
	let newMemberPhone = $state('');
	let newMemberSpecialization = $state('');
	let newMemberStatus = $state('Active');

	let diaryEntries = $state([
		{ id: '1', date: '2026-08-14', site: 'Lilongwe Water Project', activities: 'Excavation work continued, 50% complete', weather: 'Sunny', issues: 'None', author: 'John Banda' },
		{ id: '2', date: '2026-08-13', site: 'Blantyre Road Construction', activities: 'Foundation pouring completed', weather: 'Cloudy', issues: 'Minor delay due to rain', author: 'James Zulu' },
		{ id: '3', date: '2026-08-12', site: 'Mzuzu Hospital Extension', activities: 'Site survey completed', weather: 'Rainy', issues: 'Equipment malfunction', author: 'Sarah Mwale' }
	]);

	let activityLog = $state([
		{ id: '1', action: 'Site created', user: 'John Banda', date: '2026-01-15T10:00:00Z', details: 'Site registered in system' },
		{ id: '2', action: 'Team assigned', user: 'John Banda', date: '2026-01-16T14:30:00Z', details: 'Site team assigned' },
		{ id: '3', action: 'Equipment delivered', user: 'Peter Phiri', date: '2026-01-20T09:15:00Z', details: 'Construction equipment delivered' },
		{ id: '4', action: 'Work commenced', user: 'John Banda', date: '2026-01-22T08:00:00Z', details: 'Construction work started' },
		{ id: '5', action: 'Progress update', user: 'Mary Chirwa', date: '2026-08-10T16:45:00Z', details: '65% progress achieved' }
	]);

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
			case 'On Leave':
				return 'bg-yellow-100 text-yellow-700';
			case 'Completed':
				return 'bg-blue-100 text-blue-700';
			case 'Open':
				return 'bg-red-100 text-red-700';
			case 'In Progress':
				return 'bg-yellow-100 text-yellow-700';
			case 'Resolved':
				return 'bg-green-100 text-green-700';
			case 'Pending':
				return 'bg-yellow-100 text-yellow-700';
			case 'Approved':
				return 'bg-green-100 text-green-700';
			case 'Rejected':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	// Team member modal functions
	function openTeamMemberModal() {
		showTeamMemberModal = true;
		newMemberName = '';
		newMemberRole = '';
		newMemberPhone = '';
		newMemberSpecialization = '';
		newMemberStatus = 'Active';
	}

	function closeTeamMemberModal() {
		showTeamMemberModal = false;
		newMemberName = '';
		newMemberRole = '';
		newMemberPhone = '';
		newMemberSpecialization = '';
		newMemberStatus = 'Active';
	}

	function handleAddTeamMember() {
		if (!newMemberName || !newMemberRole) {
			alert('Please enter member name and select a role');
			return;
		}

		const role = constructionRoles.find(r => r.id === newMemberRole);
		const newMember = {
			id: String(engineers.length + supervisors.length + visitors.length + 1),
			name: newMemberName,
			site: site.name,
			specialization: newMemberSpecialization || role?.name || '',
			phone: newMemberPhone,
			status: newMemberStatus,
			role: role?.name || ''
		};

		// Add to appropriate array based on role category
		if (role?.category === 'Engineering') {
			engineers = [...engineers, newMember];
		} else if (role?.category === 'Supervision') {
			supervisors = [...supervisors, { ...newMember, shift: 'Day' }];
		} else {
			visitors = [...visitors, { ...newMember, organization: 'Internal', purpose: 'Team Assignment', date: new Date().toISOString().split('T')[0] }];
		}

		closeTeamMemberModal();
	}
</script>

<div class="p-6">
	<!-- Site Header -->
	<div class="bg-white shadow p-6 mb-6">
		<button onclick={() => window.location.href = '/site-management'} class="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors mb-4">
			<Icon icon="mdi:arrow-left" class="w-4 h-4" />
			<span>Back</span>
		</button>
		<div class="flex items-start justify-between mb-4">
			<div>
				<h1 class="text-lg font-bold text-gray-800">{site.name}</h1>
				<p class="text-sm text-gray-600">{site.client}</p>
				<p class="text-xs text-gray-500 mt-1">Location: {site.location}</p>
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
				<span class="text-gray-500">Status:</span>
				<span class="ml-2 px-2 py-1 rounded {getStatusColor(site.status)}">{site.status}</span>
			</div>
			<div>
				<span class="text-gray-500">Progress:</span>
				<span class="ml-2 font-medium text-gray-800">{site.progress}% Complete</span>
			</div>
			<div>
				<span class="text-gray-500">Start Date:</span>
				<span class="ml-2 font-medium text-gray-800">{formatDate(site.startDate)}</span>
			</div>
			<div>
				<span class="text-gray-500">End Date:</span>
				<span class="ml-2 font-medium text-gray-800">{formatDate(site.endDate)}</span>
			</div>
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
							<span class="text-xs text-gray-500">Start Date</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatDate(site.startDate)}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:calendar-check" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">End Date</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatDate(site.endDate)}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:cash" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Project Value</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatValue(site.value)}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:account-hard-hat" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Site Manager</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{site.siteManager}</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-6">
					<div class="bg-gray-50 p-4 rounded-lg">
						<h3 class="text-xs font-semibold text-gray-700 mb-3">Project Description</h3>
						<p class="text-xs text-gray-600">{site.description}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<h3 class="text-xs font-semibold text-gray-700 mb-3">Project Details</h3>
						<div class="space-y-2 text-xs">
							<div class="flex justify-between">
								<span class="text-gray-500">Project Type:</span>
								<span class="text-gray-800">{site.projectType}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500">Client:</span>
								<span class="text-gray-800">{site.client}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-500">Location:</span>
								<span class="text-gray-800">{site.location}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-6">
					<h3 class="text-xs font-semibold text-gray-700 mb-4">Activity Timeline</h3>
					<div class="space-y-3">
						{#each activityLog as activity}
							<div class="flex items-start gap-3 p-3 bg-gray-50 rounded">
								<Icon icon="mdi:clock" class="w-4 h-4 text-gray-500 mt-0.5" />
								<div class="flex-1">
									<p class="text-xs font-medium text-gray-800">{activity.action}</p>
									<p class="text-[10px] text-gray-600">{activity.details}</p>
									<p class="text-[10px] text-gray-400 mt-1">{activity.user} • {formatDate(activity.date)}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

			{:else if activeTab === 'team'}
				<!-- Team Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Team</h3>
						<button
							onclick={openTeamMemberModal}
							class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
						>
							<Icon icon="mdi:account-plus" class="w-4 h-4" />
							<span>Add Member</span>
						</button>
					</div>

					<!-- Sub-tabs for team types -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button class="px-3 py-2 text-xs border-b-2 border-[#5fc5c0] text-[#5fc5c0]">Site Engineers</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Site Supervisors</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Visitors</button>
						</nav>
					</div>

					<!-- Site Engineers Content -->
					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-gray-200">
									<th class="text-left py-3 px-4 font-medium text-gray-600">Name</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Site</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Specialization</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Phone</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Status</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each engineers as engineer}
									<tr class="border-b border-gray-100 hover:bg-gray-50">
										<td class="py-3 px-4 font-medium text-gray-800">{engineer.name}</td>
										<td class="py-3 px-4 text-gray-600">{engineer.site}</td>
										<td class="py-3 px-4 text-gray-600">{engineer.specialization}</td>
										<td class="py-3 px-4 text-gray-600">{engineer.phone}</td>
										<td class="py-3 px-4">
											<span class="px-2 py-1 rounded {getStatusColor(engineer.status)}">{engineer.status}</span>
										</td>
										<td class="py-3 px-4">
											<button class="text-[#5fc5c0] hover:text-[#114a4b] font-medium">Edit</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

			{:else if activeTab === 'diary'}
				<!-- Daily Site Diary Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Daily Site Diary</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>New Entry</span>
						</button>
					</div>

					<div class="space-y-3">
						{#each diaryEntries as entry}
							<div class="p-4 border border-gray-200 rounded bg-white">
								<div class="flex items-start justify-between mb-3">
									<div>
										<p class="text-xs font-medium text-gray-800">{entry.site}</p>
										<p class="text-[10px] text-gray-500">{formatDate(entry.date)}</p>
									</div>
									<span class="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700">{entry.weather}</span>
								</div>
								<div class="mb-2">
									<p class="text-[10px] font-medium text-gray-500 mb-1">Activities</p>
									<p class="text-xs text-gray-700">{entry.activities}</p>
								</div>
								{#if entry.issues !== 'None'}
									<div class="mb-2">
										<p class="text-[10px] font-medium text-red-500 mb-1">Issues</p>
										<p class="text-xs text-red-600">{entry.issues}</p>
									</div>
								{/if}
								<div class="flex items-center justify-between pt-2 border-t border-gray-100">
									<span class="text-[10px] text-gray-500">By {entry.author}</span>
									<button class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View Details</button>
								</div>
							</div>
						{/each}
					</div>
				</div>

			{:else if activeTab === 'reports'}
				<!-- Reports Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Reports</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>New Report</span>
						</button>
					</div>

					<!-- Sub-tabs for report types -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button class="px-3 py-2 text-xs border-b-2 border-[#5fc5c0] text-[#5fc5c0]">Daily Reports</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Weekly Reports</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Monthly Reports</button>
						</nav>
					</div>

					<!-- Daily Reports Content -->
					<div class="space-y-3">
						<div class="p-4 border border-gray-200 rounded bg-white">
							<div class="flex items-start justify-between mb-3">
								<div>
									<p class="text-xs font-medium text-gray-800">Daily Report - Aug 14, 2026</p>
									<p class="text-[10px] text-gray-500">Lilongwe Water Project</p>
								</div>
								<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Submitted</span>
							</div>
							<div class="mb-2">
								<p class="text-[10px] font-medium text-gray-500 mb-1">Summary</p>
								<p class="text-xs text-gray-700">Excavation work continued, 50% complete. No major issues reported.</p>
							</div>
							<div class="flex items-center justify-between pt-2 border-t border-gray-100">
								<span class="text-[10px] text-gray-500">By John Banda</span>
								<button class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View Details</button>
							</div>
						</div>
						<div class="p-4 border border-gray-200 rounded bg-white">
							<div class="flex items-start justify-between mb-3">
								<div>
									<p class="text-xs font-medium text-gray-800">Daily Report - Aug 13, 2026</p>
									<p class="text-[10px] text-gray-500">Blantyre Road Construction</p>
								</div>
								<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Submitted</span>
							</div>
							<div class="mb-2">
								<p class="text-[10px] font-medium text-gray-500 mb-1">Summary</p>
								<p class="text-xs text-gray-700">Foundation pouring completed. Minor delay due to rain.</p>
							</div>
							<div class="flex items-center justify-between pt-2 border-t border-gray-100">
								<span class="text-[10px] text-gray-500">By James Zulu</span>
								<button class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View Details</button>
							</div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'documents'}
				<!-- Site Documents Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Site Documents</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:upload" class="w-4 h-4" />
							<span>Upload</span>
						</button>
					</div>

					<!-- Sub-tabs for document types -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button class="px-3 py-2 text-xs border-b-2 border-[#5fc5c0] text-[#5fc5c0]">Photos</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Videos</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Documents</button>
						</nav>
					</div>

					<!-- Photos Content -->
					<div class="grid grid-cols-4 gap-4">
						{#each sitePhotos as photo}
							<div class="border border-gray-200 rounded bg-white p-3">
								<div class="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
									<Icon icon="mdi:image" class="w-8 h-8 text-gray-400" />
								</div>
								<p class="text-xs font-medium text-gray-800 truncate">{photo.name}</p>
								<p class="text-[10px] text-gray-500">{photo.site}</p>
								<div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
									<span class="text-[10px] text-gray-400">{photo.size}</span>
									<button class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View</button>
								</div>
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

					{#if communications.length === 0}
						<div class="text-center py-12">
							<Icon icon="mdi:message-text" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
							<p class="text-sm text-gray-500">No communications yet</p>
							<p class="text-xs text-gray-400">Send your first message to start the conversation</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each communications as comm}
								<div class="p-4 border border-gray-200 rounded bg-white">
									<div class="flex items-start justify-between mb-3">
										<div class="flex items-center gap-3">
											<Icon icon="mdi:account-group" class="w-5 h-5 text-gray-600" />
											<div>
												<p class="text-xs font-medium text-gray-800">{comm.subject}</p>
												<p class="text-[10px] text-gray-500">
													To: Team • From: {comm.sender}
												</p>
											</div>
										</div>
										<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">{comm.status}</span>
									</div>

									<p class="text-[10px] text-gray-600 mb-3">{comm.message}</p>

									<div class="flex items-center justify-between pt-3 border-t border-gray-100">
										<span class="text-[10px] text-gray-400">{formatDate(comm.date)}</span>
										<button class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View Details</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if activeTab === 'management'}
				<!-- Management Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Management</h3>
						<button class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>Add New</span>
						</button>
					</div>

					<!-- Sub-tabs for management types -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button class="px-3 py-2 text-xs border-b-2 border-[#5fc5c0] text-[#5fc5c0]">Checklist</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Requests</button>
							<button class="px-3 py-2 text-xs border-b-2 border-transparent text-gray-600 hover:text-gray-800">Issues</button>
						</nav>
					</div>

					<!-- Checklist Content -->
					<div class="space-y-3">
						{#each checklist as item}
							<div class="p-4 border border-gray-200 rounded bg-white">
								<div class="flex items-start justify-between mb-2">
									<div class="flex items-center gap-3">
										<div class="w-5 h-5 rounded border-2 flex items-center justify-center {item.status === 'Completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'}">
											{#if item.status === 'Completed'}
												<Icon icon="mdi:check" class="w-3 h-3 text-white" />
											{/if}
										</div>
										<div>
											<p class="text-xs font-medium text-gray-800">{item.item}</p>
											<p class="text-[10px] text-gray-500">{item.site} • {item.category}</p>
										</div>
									</div>
									<span class="text-[10px] px-2 py-1 rounded {getStatusColor(item.status)}">{item.status}</span>
								</div>
								<div class="flex items-center justify-between pt-2 border-t border-gray-100">
									<span class="text-[10px] text-gray-500">Due: {formatDate(item.date)}</span>
									<button class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">Edit</button>
								</div>
							</div>
						{/each}
					</div>
				</div>

			{:else}
				<!-- Other tabs placeholder -->
				<div class="text-center py-12">
					<Icon icon="mdi:construction" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
					<p class="text-sm text-gray-500">{tabs.find(t => t.id === activeTab)?.label} module</p>
					<p class="text-xs text-gray-400">Coming soon</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Team Member Modal -->
	{#if showTeamMemberModal}
		<div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div class="bg-white p-6 max-w-2xl w-full mx-4 shadow-xl rounded-lg">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-sm font-bold text-gray-800">Add Team Member</h2>
					<button onclick={closeTeamMemberModal} class="text-gray-500 hover:text-gray-700">
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="col-span-2">
						<label for="memberName" class="block text-xs font-medium text-gray-700 mb-1">Member Name *</label>
						<input
							id="memberName"
							type="text"
							bind:value={newMemberName}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="e.g., John Banda"
						/>
					</div>
					<div class="col-span-2">
						<label for="memberRole" class="block text-xs font-medium text-gray-700 mb-1">Role *</label>
						<select
							id="memberRole"
							bind:value={newMemberRole}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">Select role</option>
							{#each constructionRoles as role}
								<option value={role.id}>{role.name} ({role.category})</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="memberPhone" class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
						<input
							id="memberPhone"
							type="text"
							bind:value={newMemberPhone}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="e.g., +265 991 234 567"
						/>
					</div>
					<div>
						<label for="memberSpecialization" class="block text-xs font-medium text-gray-700 mb-1">Specialization</label>
						<input
							id="memberSpecialization"
							type="text"
							bind:value={newMemberSpecialization}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="e.g., Civil Engineering"
						/>
					</div>
					<div>
						<label for="memberStatus" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
						<select
							id="memberStatus"
							bind:value={newMemberStatus}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="Active">Active</option>
							<option value="On Leave">On Leave</option>
							<option value="Completed">Completed</option>
						</select>
					</div>
				</div>

				<div class="flex justify-end gap-2 mt-6">
					<button
						onclick={closeTeamMemberModal}
						class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleAddTeamMember}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Add Member
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
