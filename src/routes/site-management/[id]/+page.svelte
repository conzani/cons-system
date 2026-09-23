<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Get site ID from URL
	let siteId = $derived($page.params.id);

	// Real site detail data will be loaded from the backend; no demo site records remain here.
	let allSites = $state<any[]>([]);
	let site = $state<any>({
		id: '',
		name: '',
		location: '',
		client: '',
		status: 'Active',
		startDate: '',
		endDate: '',
		progress: 0,
		siteManager: '',
		value: 0,
		projectType: '',
		description: ''
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

	// Real modules will load site team, issues, requests, reports and communications from the backend.
	let engineers = $state<any[]>([]);
	let supervisors = $state<any[]>([]);
	let visitors = $state<any[]>([]);
	let siteManagerName = $state('');
	let issues = $state<any[]>([]);
	let requests = $state<any[]>([]);
	let checklist = $state<any[]>([]);
	let showChecklistForm = $state(false);
	let newChecklistItem = $state('');
	let newChecklistCategory = $state('General');
	let sitePhotos = $state<any[]>([]);
	let siteVideos = $state<any[]>([]);
	let siteDocuments = $state<any[]>([]);
	let communications = $state<any[]>([]);

	let siteAttendance = $state<any[]>([]);

	let showAttendanceModal = $state(false);
	let newAttendanceEmployee = $state('');
	let newAttendanceDate = $state(new Date().toISOString().split('T')[0]);
	let newAttendanceShift = $state('Day Shift');
	let newAttendanceStatus = $state('Present');
	let newAttendanceHours = $state('8');
	let newAttendanceNotes = $state('');

	let assignedSiteMembers = $derived.by(() => {
		const managerMember = siteManagerName || site.siteManager
			? {
					id: String(site.siteManagerId ?? 'site-manager'),
					name: siteManagerName || site.siteManager,
					role: 'Site Manager',
					status: 'Active'
				}
			: null;

		const members = [
			...(managerMember ? [managerMember] : []),
			...engineers.filter((member) => member.site === site.name).map((member) => ({
				id: member.id,
				name: member.name,
				role: member.specialization || 'Team Member',
				status: member.status
			})),
			...supervisors.filter((member) => member.site === site.name).map((member) => ({
				id: member.id,
				name: member.name,
				role: 'Supervisor',
				status: member.status
			}))
		];

		const uniqueMembers = new Map<string, { id: string; name: string; role: string; status: string }>();
		for (const member of members) {
			if (!uniqueMembers.has(member.name)) {
				uniqueMembers.set(member.name, member);
			}
		}

		return Array.from(uniqueMembers.values());
	});

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

	// Real employee data for dropdowns and site assignment
	let realEmployees = $state<any[]>([]);
	let employees = $derived(realEmployees);

	async function loadEmployees() {
		try {
			const response = await fetch('/api/employees');
			if (!response.ok) return;
			const payload = await response.json();
			const data = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
			realEmployees = data;
			if (site && (site.siteManagerId || site.siteManager)) {
				const managerMatch = realEmployees.find((employee) => String(employee.id) === String(site.siteManagerId));
				if (managerMatch) {
					siteManagerName = `${managerMatch.firstname ?? ''} ${managerMatch.lastname ?? ''}`.trim();
					site.siteManager = siteManagerName;
				}
			}
		} catch (error) {
			console.error('Error loading employees:', error);
		}
	}

	async function loadSiteDetails() {
		try {
			const response = await fetch(`/api/sites?id=${siteId}`);
			if (!response.ok) return;
			const payload = await response.json();
			if (!payload) return;
			site = {
				...site,
				...payload,
				siteManager: payload.siteManager || payload.siteManagerName || ''
			};
			if (payload.siteManagerId) {
				const managerMatch = realEmployees.find((employee) => String(employee.id) === String(payload.siteManagerId));
				if (managerMatch) {
					siteManagerName = `${managerMatch.firstname ?? ''} ${managerMatch.lastname ?? ''}`.trim();
					site.siteManager = siteManagerName;
				}
			}
			syncChecklistForProjectType(site.projectType || payload.projectType || 'Construction');
		} catch (error) {
			console.error('Error loading site details:', error);
		}
	}

	const projectTypeChecklistMap: Record<string, Array<{ id: string; item: string; category: string; status: string; date: string }>> = {
		Infrastructure: [
			{ id: 'infra-1', item: 'Survey and site layout approved', category: 'Planning', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'infra-2', item: 'Safety briefing completed', category: 'Safety', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'infra-3', item: 'Material delivery schedule confirmed', category: 'Logistics', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'infra-4', item: 'Environmental monitoring checklist submitted', category: 'Compliance', status: 'Pending', date: new Date().toISOString().split('T')[0] }
		],
		Construction: [
			{ id: 'cons-1', item: 'Site mobilisation complete', category: 'Mobilisation', status: 'Completed', date: new Date().toISOString().split('T')[0] },
			{ id: 'cons-2', item: 'Foundation inspection signed off', category: 'Quality', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'cons-3', item: 'Daily labour attendance verified', category: 'Operations', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'cons-4', item: 'Progress photos uploaded', category: 'Reporting', status: 'Pending', date: new Date().toISOString().split('T')[0] }
		],
		Renovation: [
			{ id: 'reno-1', item: 'Scope of works reviewed with client', category: 'Planning', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'reno-2', item: 'Existing structure inspected', category: 'Survey', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'reno-3', item: 'Temporary access and protection in place', category: 'Safety', status: 'Pending', date: new Date().toISOString().split('T')[0] },
			{ id: 'reno-4', item: 'Final snag list prepared', category: 'Closeout', status: 'Pending', date: new Date().toISOString().split('T')[0] }
		]
	};

	function getProjectChecklist(projectType: string) {
		const template = projectTypeChecklistMap[projectType] || projectTypeChecklistMap.Construction;
		return template.map((item) => ({ ...item }));
	}

	function syncChecklistForProjectType(projectType: string) {
		if (!projectType) {
			checklist = [];
			return;
		}
		if (!checklist.length) {
			checklist = getProjectChecklist(projectType);
		}
	}

	function addChecklistItem() {
		const value = newChecklistItem.trim();
		if (!value) return;
		checklist = [{
			id: `custom-${Date.now()}`,
			item: value,
			category: newChecklistCategory,
			status: 'Pending',
			date: new Date().toISOString().split('T')[0],
			isCustom: true
		}, ...checklist];
		newChecklistItem = '';
		newChecklistCategory = 'General';
		showChecklistForm = false;
	}

	function toggleChecklistStatus(item: any) {
		checklist = checklist.map((entry) => entry.id === item.id
			? { ...entry, status: entry.status === 'Completed' ? 'Pending' : 'Completed' }
			: entry
		);
	}

	function removeChecklistItem(itemId: string) {
		checklist = checklist.filter((item) => item.id !== itemId);
	}

	// Team member modal state
	let showTeamMemberModal = $state(false);
	let selectedEmployee = $state('');
	let newMemberRole = $state('');
	let newMemberPhone = $state('');
	let newMemberSpecialization = $state('');
	let newMemberStatus = $state('Active');

	// Handle employee selection
	function handleEmployeeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedEmployee = target.value;
		const employee = realEmployees.find((e) => String(e.id) === selectedEmployee);
		if (employee) {
			newMemberPhone = employee.phone || '';
			newMemberSpecialization = employee.department?.name || employee.position?.name || '';
		}
	}

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
			case 'Sick':
				return 'bg-red-100 text-red-700';
			case 'Present':
				return 'bg-emerald-100 text-emerald-700';
			case 'Late':
				return 'bg-amber-100 text-amber-700';
			case 'Absent':
				return 'bg-gray-200 text-gray-700';
			case 'On Site':
				return 'bg-cyan-100 text-cyan-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getAttendanceSummary() {
		const present = siteAttendance.filter((entry) => entry.status === 'Present' || entry.status === 'On Site').length;
		const sick = siteAttendance.filter((entry) => entry.status === 'Sick').length;
		const late = siteAttendance.filter((entry) => entry.status === 'Late').length;
		const absent = siteAttendance.filter((entry) => entry.status === 'Absent').length;
		return { present, sick, late, absent };
	}

	function openAddAttendanceModal() {
		const members = [...assignedSiteMembers];
		if (!members.length) {
			alert('No team members are assigned to this site yet. Add employees in the Team tab first.');
			return;
		}

		showAttendanceModal = true;
		newAttendanceEmployee = members[0].name;
		newAttendanceDate = new Date().toISOString().split('T')[0];
		newAttendanceShift = 'Day Shift';
		newAttendanceStatus = 'Present';
		newAttendanceHours = '8';
		newAttendanceNotes = '';
	}

	function closeAttendanceModal() {
		showAttendanceModal = false;
		newAttendanceEmployee = '';
		newAttendanceDate = new Date().toISOString().split('T')[0];
		newAttendanceShift = 'Day Shift';
		newAttendanceStatus = 'Present';
		newAttendanceHours = '8';
		newAttendanceNotes = '';
	}

	function handleAddAttendance() {
		if (!newAttendanceEmployee) {
			alert('Select an employee assigned to this site');
			return;
		}

		const selectedMember = [...assignedSiteMembers].find((member) => member.name === newAttendanceEmployee);
		const attendanceEntry = {
			id: String(Date.now()),
			employeeName: newAttendanceEmployee,
			role: selectedMember?.role ?? 'Team Member',
			date: newAttendanceDate,
			shift: newAttendanceShift,
			status: newAttendanceStatus,
			hours: Number(newAttendanceHours) || 0,
			notes: newAttendanceNotes || (newAttendanceStatus === 'Sick' ? 'Reported sick and excused from site work.' : 'Attendance recorded for this site.')
		};

		siteAttendance = [attendanceEntry, ...siteAttendance];
		closeAttendanceModal();
	}

	// Team member modal functions
	function openTeamMemberModal() {
		showTeamMemberModal = true;
		selectedEmployee = '';
		newMemberRole = '';
		newMemberPhone = '';
		newMemberSpecialization = '';
		newMemberStatus = 'Active';
	}

	function closeTeamMemberModal() {
		showTeamMemberModal = false;
		selectedEmployee = '';
		newMemberRole = '';
		newMemberPhone = '';
		newMemberSpecialization = '';
		newMemberStatus = 'Active';
	}

	function handleAddTeamMember() {
		if (!selectedEmployee || !newMemberRole) {
			alert('Please select an employee and a role');
			return;
		}

		const employee = realEmployees.find((e) => String(e.id) === selectedEmployee);
		const role = constructionRoles.find((r) => r.id === newMemberRole);
		const employeeName = `${employee?.firstname ?? ''} ${employee?.lastname ?? ''}`.trim() || 'Selected employee';
		const newMember = {
			id: String(engineers.length + supervisors.length + visitors.length + 1),
			name: employeeName,
			site: site.name,
			specialization: newMemberSpecialization || role?.name || '',
			phone: newMemberPhone || employee?.phone || '',
			status: newMemberStatus,
			role: role?.name || ''
		};

		if (role?.category === 'Engineering') {
			engineers = [...engineers, newMember];
		} else if (role?.category === 'Supervision') {
			supervisors = [...supervisors, { ...newMember, shift: 'Day' }];
		} else {
			visitors = [...visitors, { ...newMember, organization: 'Internal', purpose: 'Team Assignment', date: new Date().toISOString().split('T')[0] }];
		}

		closeTeamMemberModal();
	}

	onMount(() => {
		loadEmployees();
		loadSiteDetails();
	});
</script>

<div class="p-6">
	<!-- Back Button -->
	<div class="mb-4">
		<button
			onclick={() => goto('/site-management')}
			class="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
		>
			<Icon icon="mdi:arrow-left" class="w-4 h-4" />
			<span>Back to Sites</span>
		</button>
	</div>

	<!-- Site Header -->
	<div class="bg-[#114a4b] text-white p-5 mb-6 shadow">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<h1 class="text-lg font-semibold">{site.name}</h1>
				<p class="text-xs text-white/75 mt-1">{site.client} · {site.location}</p>
				<p class="text-[10px] uppercase tracking-widest text-[#a8e2de]">Site Progress</p>
				<div class="flex items-center gap-3 mt-1">
					<p class="text-lg font-semibold">{site.progress}% complete</p>
					<div class="w-96 bg-white/20 rounded-full h-2">
						<div class="bg-[#5fc5c0] h-2 rounded-full" style="width: {site.progress}%"></div>
					</div>
				</div>
				<p class="text-xs text-white/75 mt-1">
					{formatDate(site.startDate)} - {formatDate(site.endDate)}
				</p>
			</div>
			<div class="flex gap-2">
				<button class="flex items-center gap-2 px-3 py-2 border border-white/30 text-white text-xs hover:bg-white/10 transition-colors">
					<Icon icon="mdi:pencil" class="w-4 h-4" />
					<span>Edit</span>
				</button>
				<button class="flex items-center gap-2 px-3 py-2 border border-white/30 text-white text-xs hover:bg-white/10 transition-colors">
					<Icon icon="mdi:printer" class="w-4 h-4" />
					<span>Print</span>
				</button>
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

			{:else if activeTab === 'attendance'}
				<div class="space-y-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Site attendance</h3>
						<button
							onclick={openAddAttendanceModal}
							class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
						>
							<Icon icon="mdi:calendar-plus" class="w-4 h-4" />
							<span>Add Attendance</span>
						</button>
					</div>

					{#if siteAttendance.length === 0}
						<div class="bg-gray-50 border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
							No site attendance records yet. Add an entry using the team members assigned to this site.
						</div>
					{:else}
						<div class="bg-white border border-gray-200 overflow-hidden">
							<table class="w-full text-xs">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Employee</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Shift</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Hours</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Notes</th>
									</tr>
								</thead>
								<tbody>
									{#each siteAttendance as entry}
										<tr class="border-t border-gray-200 hover:bg-gray-50">
											<td class="px-4 py-3 font-medium text-gray-800">{entry.employeeName}</td>
											<td class="px-4 py-3 text-gray-600">{entry.role}</td>
											<td class="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
											<td class="px-4 py-3 text-gray-600">{entry.shift}</td>
											<td class="px-4 py-3 text-gray-600">{entry.hours.toFixed(1)}h</td>
											<td class="px-4 py-3"><span class="px-2 py-1 rounded {getStatusColor(entry.status)}">{entry.status}</span></td>
											<td class="px-4 py-3 text-gray-600 max-w-xs">{entry.notes}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
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
							<button
								type="button"
								onclick={() => showChecklistForm = !showChecklistForm}
								class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#3bb3b0] transition-colors"
							>
								<Icon icon="mdi:plus" class="w-4 h-4" />
								<span>{showChecklistForm ? 'Close' : 'Add New'}</span>
							</button>
						</div>

						{#if showChecklistForm}
							<div class="mb-4 p-4 border border-gray-200 bg-gray-50 space-y-3">
								<div>
									<label for="checklist-item" class="block text-[10px] font-medium text-gray-700 mb-1">Checklist item</label>
									<input id="checklist-item" bind:value={newChecklistItem} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="New project milestone" />
								</div>
								<div>
									<label for="checklist-category" class="block text-[10px] font-medium text-gray-700 mb-1">Category</label>
									<select id="checklist-category" bind:value={newChecklistCategory} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
										<option value="General">General</option>
										<option value="Planning">Planning</option>
										<option value="Safety">Safety</option>
										<option value="Quality">Quality</option>
										<option value="Reporting">Reporting</option>
										<option value="Closeout">Closeout</option>
									</select>
								</div>
								<div class="flex justify-end">
									<button type="button" onclick={addChecklistItem} class="px-3 py-2 bg-[#114a4b] text-white text-xs hover:bg-[#0f3b3d] transition-colors">Save item</button>
								</div>
							</div>
						{/if}

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
									<div class="flex items-start justify-between mb-2 gap-3">
										<div class="flex items-center gap-3 flex-1">
											<button type="button" onclick={() => toggleChecklistStatus(item)} class="w-5 h-5 rounded border-2 flex items-center justify-center {item.status === 'Completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'}">
												{#if item.status === 'Completed'}
													<Icon icon="mdi:check" class="w-3 h-3 text-white" />
												{/if}
											</button>
											<div>
												<p class="text-xs font-medium text-gray-800">{item.item}</p>
												<p class="text-[10px] text-gray-500">{item.category}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<span class="text-[10px] px-2 py-1 rounded {getStatusColor(item.status)}">{item.status}</span>
											<button type="button" onclick={() => removeChecklistItem(item.id)} class="text-[10px] text-red-500 hover:text-red-700">Remove</button>
										</div>
									</div>
									<div class="flex items-center justify-between pt-2 border-t border-gray-100">
										<span class="text-[10px] text-gray-500">Due: {formatDate(item.date)}</span>
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

	{#if showAttendanceModal}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div class="bg-white w-full max-w-lg shadow-xl p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-bold text-gray-800">Add Site Attendance</h2>
					<button onclick={closeAttendanceModal} class="text-gray-500 hover:text-gray-700">
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>

				<div class="space-y-4">
					<div>
						<label for="attendanceEmployee" class="block text-xs font-medium text-gray-700 mb-1">Assigned employee</label>
						<select id="attendanceEmployee" bind:value={newAttendanceEmployee} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="">Select employee</option>
							{#each assignedSiteMembers as member}
								<option value={member.name}>{member.name} · {member.role}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="attendanceDate" class="block text-xs font-medium text-gray-700 mb-1">Date</label>
							<input id="attendanceDate" type="date" bind:value={newAttendanceDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						</div>
						<div>
							<label for="attendanceShift" class="block text-xs font-medium text-gray-700 mb-1">Shift</label>
							<select id="attendanceShift" bind:value={newAttendanceShift} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
								<option value="Day Shift">Day Shift</option>
								<option value="Night Shift">Night Shift</option>
								<option value="Weekend Shift">Weekend Shift</option>
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="attendanceStatus" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
							<select id="attendanceStatus" bind:value={newAttendanceStatus} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
								<option value="Present">Present</option>
								<option value="Late">Late</option>
								<option value="Sick">Sick</option>
								<option value="Absent">Absent</option>
								<option value="On Site">On Site</option>
							</select>
						</div>
						<div>
							<label for="attendanceHours" class="block text-xs font-medium text-gray-700 mb-1">Hours worked</label>
							<input id="attendanceHours" type="number" min="0" step="0.5" bind:value={newAttendanceHours} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						</div>
					</div>

					<div>
						<label for="attendanceNotes" class="block text-xs font-medium text-gray-700 mb-1">Note</label>
						<textarea id="attendanceNotes" bind:value={newAttendanceNotes} rows="3" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Add notes for attendance, delays, or sick leave." ></textarea>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button onclick={closeAttendanceModal} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
					<button onclick={handleAddAttendance} class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">Save record</button>
				</div>
			</div>
		</div>
	{/if}

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
						<label for="employeeSelect" class="block text-xs font-medium text-gray-700 mb-1">Select Employee *</label>
						<select
							id="employeeSelect"
							bind:value={selectedEmployee}
							onchange={handleEmployeeChange}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">Select an employee</option>
							{#each realEmployees as employee}
								<option value={String(employee.id)}>{employee.firstname} {employee.lastname}</option>
							{/each}
						</select>
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
