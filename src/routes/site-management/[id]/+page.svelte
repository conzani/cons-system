<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	let { data }: { data: { user: any } } = $props();
	
	// Handle case where data might not be available
	let userData = $derived(data?.user);

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
	let activeTab = $state($page.url.searchParams.get('tab') || 'overview');
	const tabs = [
		{ id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
		{ id: 'attendance', label: 'Site Attendance', icon: 'mdi:clipboard-account' },
		{ id: 'reports', label: 'Reports', icon: 'mdi:file-chart' },
		{ id: 'team', label: 'Team', icon: 'mdi:account-group' },
		{ id: 'management', label: 'Management', icon: 'mdi:cog' },
		{ id: 'documents', label: 'Site Documents', icon: 'mdi:folder-multiple' }
	];

	// Keep the active tab in the URL so a page refresh reopens the same tab
	$effect(() => {
		const url = new URL(window.location.href);
		if (activeTab !== 'overview') {
			url.searchParams.set('tab', activeTab);
		} else {
			url.searchParams.delete('tab');
		}
		window.history.replaceState({}, '', url.toString());
	});

	// Real modules will load site team, issues, requests, reports and communications from the backend.
	let engineers = $state<any[]>([]);
	let supervisors = $state<any[]>([]);
	let visitors = $state<any[]>([]);
	let siteManagerName = $state('');
	let siteManagerPhone = $state('');
	let issues = $state<any[]>([]);
	let requests = $state<any[]>([]);
	let checklist = $state<any[]>([]);
	let showChecklistForm = $state(false);
	let newChecklistItem = $state('');
	let newChecklistCategory = $state('General');
	let newChecklistDueDate = $state('');
	let siteDocuments = $state<any[]>([]);
	let communications = $state<any[]>([]);

	// Management sub-tab (Checklist | Requests | Issues)
	let managementSubTab = $state('checklist');

	// Site requests (site_requests table)
	let showRequestModal = $state(false);
	let isSavingRequest = $state(false);
	let newRequestType = $state('Material');
	let newRequestUrgency = $state('Normal');
	let newRequestReason = $state('');
	let newRequestNeededBy = $state('');
	let newRequestItems = $state<any[]>([{ description: '', unit: '', quantity: 1, estimatedPrice: null }]);

	let newRequestEstimatedTotal = $derived(
		newRequestItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.estimatedPrice) || 0), 0)
	);

	async function loadSiteRequests() {
		try {
			const response = await fetch(`/api/site-requests?siteId=${siteId}`);
			if (response.ok) {
				const payload = await response.json();
				requests = Array.isArray(payload) ? payload : [];
			}
		} catch (error) {
			console.error('Error loading site requests:', error);
		}
	}

	function openRequestModal() {
		showRequestModal = true;
		newRequestType = 'Material';
		newRequestUrgency = 'Normal';
		newRequestReason = '';
		newRequestNeededBy = '';
		newRequestItems = [{ description: '', unit: '', quantity: 1, estimatedPrice: null }];
	}

	function closeRequestModal() {
		showRequestModal = false;
		isSavingRequest = false;
	}

	function addRequestItemRow() {
		newRequestItems = [...newRequestItems, { description: '', unit: '', quantity: 1, estimatedPrice: null }];
	}

	function removeRequestItemRow(index: number) {
		if (newRequestItems.length <= 1) return;
		newRequestItems = newRequestItems.filter((_, i) => i !== index);
	}

	async function handleCreateRequest() {
		const validItems = newRequestItems.filter((it) => it.description.trim());
		if (!validItems.length) {
			alert('Add at least one item with a description');
			return;
		}

		isSavingRequest = true;
		try {
			const response = await fetch('/api/site-requests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: String(siteId),
					requestType: newRequestType,
					urgency: newRequestUrgency,
					reason: newRequestReason,
					neededBy: newRequestNeededBy || null,
					requestedBy: userData?.id ? String(userData?.id) : null,
					items: validItems
				})
			});

			if (response.ok) {
				await loadSiteRequests();
				closeRequestModal();
			} else {
				const error = await response.json();
				toast.error(error.error || 'Failed to create request');
			}
		} catch (error) {
			console.error('Error creating request:', error);
			toast.error('Failed to create request: ' + (error as Error).message);
		} finally {
			isSavingRequest = false;
		}
	}

	async function updateRequestStatus(requestId: string, action: string) {
		let rejectionReason: string | null = null;
		if (action === 'reject') {
			rejectionReason = prompt('Reason for rejection (optional):');
			if (rejectionReason === null) return;
		}

		try {
			const response = await fetch(`/api/site-requests?id=${requestId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, approvedBy: data.user?.id, rejectionReason })
			});

			if (response.ok) {
				await loadSiteRequests();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to update request');
			}
		} catch (error) {
			console.error('Error updating request:', error);
			alert('Failed to update request');
		}
	}

	function getUrgencyColor(urgency: string) {
		switch (urgency) {
			case 'Critical': return 'bg-red-100 text-red-700';
			case 'High': return 'bg-orange-100 text-orange-700';
			case 'Normal': return 'bg-blue-100 text-blue-700';
			case 'Low': return 'bg-gray-100 text-gray-600';
			default: return 'bg-gray-100 text-gray-700';
		}
	}

	// Site team members persisted in the database (site_team_members table)
	let siteTeamMembersDb = $state<any[]>([]);

	async function loadSiteTeam() {
		try {
			const response = await fetch(`/api/site-team?siteId=${siteId}`);
			if (response.ok) {
				const payload = await response.json();
				siteTeamMembersDb = Array.isArray(payload) ? payload : [];
			}
		} catch (error) {
			console.error('Error loading site team:', error);
		}
	}

	let siteAttendance = $state<any[]>([]);

	// Edit site modal state
	let showEditSiteModal = $state(false);
	let isSavingSite = $state(false);
	let editSite = $state<any>({
		name: '',
		location: '',
		client: '',
		status: 'Active',
		startDate: '',
		endDate: '',
		progress: 0,
		siteManagerId: '',
		value: '',
		projectType: '',
		description: ''
	});

	// Helper function to safely format hours worked
	function formatHours(value: any): string {
		if (value === null || value === undefined || value === '') {
			return '0.0h';
		}
		
		const numValue = Number(value);
		if (!Number.isFinite(numValue)) {
			return '0.0h';
		}
		
		return `${Math.max(0, numValue).toFixed(1)}h`;
	}

	async function loadSiteAttendance() {
		try {
			const response = await fetch(`/api/site-attendance?siteId=${siteId}`);
			if (response.ok) {
				const data = await response.json();
				
				siteAttendance = Array.isArray(data) ? data.map((entry) => ({
					...entry,
					// Ensure hoursWorked is a number
					hoursWorked: Number(entry.hoursWorked) || 0,
					// Construct employee name from employee object
					employeeName: entry.employee?.firstname && entry.employee?.lastname 
						? `${entry.employee.firstname} ${entry.employee.lastname}` 
						: entry.employeeName || 'Unknown',
					// Fallback role
					role: entry.role || 'Team Member',
					// Use correct status field name
					status: entry.attendanceStatus || 'Unknown'
				})) : [];
			}
		} catch (error) {
			console.error('Error loading site attendance:', error);
		}
	}

	// Site Documents state
	let siteDocumentsSubTab = $state('photos');
	let showUploadDocumentModal = $state(false);
	let uploadDocFile = $state<FileList | null>(null);
	let uploadDocTitle = $state('');
	let uploadDocDescription = $state('');
	let isUploadingDoc = $state(false);
	let uploadDocProgress = $state({ done: 0, total: 0 });
	let showDocPreviewModal = $state(false);
	let previewDoc = $state<any>(null);

	let sitePhotoDocs = $derived(siteDocuments.filter((doc) => doc.mimeType?.startsWith('image/')));
	let siteVideoDocs = $derived(siteDocuments.filter((doc) => doc.mimeType?.startsWith('video/')));
	let siteOtherDocs = $derived(siteDocuments.filter((doc) => !doc.mimeType?.startsWith('image/') && !doc.mimeType?.startsWith('video/')));

	function groupDocsByDate(docs: any[]) {
		const groups = new Map<string, any[]>();
		for (const doc of docs) {
			const key = doc.createdAt ? doc.createdAt.split('T')[0] : 'unknown';
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(doc);
		}
		return Array.from(groups.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([date, items]) => ({ date, items }));
	}

	let sitePhotoGroups = $derived(groupDocsByDate(sitePhotoDocs));
	let siteVideoGroups = $derived(groupDocsByDate(siteVideoDocs));
	let siteOtherDocGroups = $derived(groupDocsByDate(siteOtherDocs));

	async function loadSiteDocuments() {
		try {
			const response = await fetch(`/api/documents?siteId=${siteId}`);
			if (response.ok) {
				siteDocuments = await response.json();
			}
		} catch (error) {
			console.error('Error loading site documents:', error);
		}
	}

	function openUploadDocumentModal() {
		showUploadDocumentModal = true;
		uploadDocFile = null;
		uploadDocTitle = '';
		uploadDocDescription = '';
		uploadDocProgress = { done: 0, total: 0 };
	}

	function closeUploadDocumentModal() {
		showUploadDocumentModal = false;
		uploadDocFile = null;
		uploadDocTitle = '';
		uploadDocDescription = '';
		isUploadingDoc = false;
		uploadDocProgress = { done: 0, total: 0 };
	}

	async function handleUploadSiteDocument() {
		if (!uploadDocFile || !uploadDocFile.length) {
			alert('Please select at least one file');
			return;
		}

		const files = Array.from(uploadDocFile);
		const isBatch = files.length > 1;
		if (!uploadDocTitle) {
			alert('Please enter a title');
			return;
		}

		isUploadingDoc = true;
		uploadDocProgress = { done: 0, total: files.length };
		const failedFiles: string[] = [];

		try {
			for (const file of files) {
				const formData = new FormData();
				formData.append('file', file);
				formData.append('title', isBatch ? `${uploadDocTitle} - ${file.name}` : uploadDocTitle);
				formData.append('description', uploadDocDescription);
				formData.append('siteId', String(siteId));
				formData.append('ownerId', String(data.user?.id ?? 1));

				const response = await fetch('/api/documents', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					uploadDocProgress = { ...uploadDocProgress, done: uploadDocProgress.done + 1 };
				} else {
					failedFiles.push(file.name);
				}
			}

			await loadSiteDocuments();

			if (failedFiles.length) {
				alert(`Failed to upload: ${failedFiles.join(', ')}`);
			} else {
				closeUploadDocumentModal();
			}
		} catch (error) {
			console.error('Error uploading site document:', error);
			alert('Failed to upload document');
		} finally {
			isUploadingDoc = false;
		}
	}

	async function downloadSiteDocument(doc: any) {
		try {
			const response = await fetch(`/api/documents/${doc.id}?download=true`);
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = window.document.createElement('a');
				a.href = url;
				a.download = doc.fileName || 'download';
				window.document.body.appendChild(a);
				a.click();
				window.document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			} else {
				alert('Failed to download document');
			}
		} catch (error) {
			console.error('Error downloading site document:', error);
			alert('Failed to download document');
		}
	}

	function openDocPreview(doc: any) {
		previewDoc = doc;
		showDocPreviewModal = true;
	}

	function closeDocPreview() {
		showDocPreviewModal = false;
		previewDoc = null;
	}

	// Site Reports state - reports are Documents tagged with a "site-report" keyword so they
	// also surface under the Site Documents tab automatically.
	let reportsSubTab = $state('Daily');
	let showUploadReportModal = $state(false);
	let uploadReportFile = $state<FileList | null>(null);
	let uploadReportTitle = $state('');
	let uploadReportSummary = $state('');
	let uploadReportType = $state('Daily');
	let isUploadingReport = $state(false);

	let siteReports = $derived(siteDocuments.filter((doc) => doc.keywords?.includes('site-report')));
	let filteredReports = $derived(siteReports.filter((doc) => doc.keywords?.includes(`report-type:${reportsSubTab}`)));
	let reportGroups = $derived(groupDocsByDate(filteredReports));

	function openUploadReportModal() {
		showUploadReportModal = true;
		uploadReportFile = null;
		uploadReportTitle = '';
		uploadReportSummary = '';
		uploadReportType = reportsSubTab;
	}

	function closeUploadReportModal() {
		showUploadReportModal = false;
		uploadReportFile = null;
		uploadReportTitle = '';
		uploadReportSummary = '';
		isUploadingReport = false;
	}

	async function handleUploadSiteReport() {
		if (!uploadReportFile || !uploadReportFile.length || !uploadReportTitle) {
			alert('Please select a file and enter a title');
			return;
		}

		isUploadingReport = true;
		try {
			const formData = new FormData();
			formData.append('file', uploadReportFile[0]);
			formData.append('title', uploadReportTitle);
			formData.append('description', uploadReportSummary);
			formData.append('siteId', String(siteId));
			formData.append('ownerId', String(data.user?.id ?? 1));
			formData.append('keywords', `site-report,report-type:${uploadReportType}`);

			const response = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				closeUploadReportModal();
				await loadSiteDocuments();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to upload report');
			}
		} catch (error) {
			console.error('Error uploading site report:', error);
			alert('Failed to upload report');
		} finally {
			isUploadingReport = false;
		}
	}

	let showAttendanceModal = $state(false);
	let newAttendanceEmployeeId = $state('');
	let newAttendanceEmployee = $state('');
	let newAttendanceDate = $state(new Date().toISOString().split('T')[0]);
	let newAttendanceShift = $state('Day Shift');
	let newAttendanceStatus = $state('Present');
	let newAttendanceStartTime = $state('08:00');
	let newAttendanceEndTime = $state('17:00');
	let newAttendanceBreakMinutes = $state('60');
	let newAttendanceNotes = $state('');

	let assignedSiteMembers = $derived.by(() => {
		const managerMember = siteManagerName || site.siteManager
			? {
					id: String(site.siteManagerId ?? 'site-manager'),
					name: siteManagerName || site.siteManager,
					role: 'Site Manager',
					phone: siteManagerPhone,
					status: 'Active'
				}
			: null;

		const members = [
			...(managerMember ? [managerMember] : []),
			...siteTeamMembersDb.map((member) => ({
				id: String(member.id),
				name: `${member.employee?.firstname ?? ''} ${member.employee?.lastname ?? ''}`.trim() || 'Unknown',
				role: member.role || 'Team Member',
				phone: member.phone || member.employee?.phone || '',
				status: member.status || 'Active'
			}))
		];

		const uniqueMembers = new Map<string, { id: string; name: string; role: string; phone: string; status: string }>();
		for (const member of members) {
			if (!uniqueMembers.has(member.name)) {
				uniqueMembers.set(member.name, member);
			}
		}

		return Array.from(uniqueMembers.values());
	});

	// Team members excluding the site manager, who is shown separately
	let siteTeamMembers = $derived(assignedSiteMembers.filter((member) => member.role !== 'Site Manager'));

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
					siteManagerPhone = managerMatch.phone || '';
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
					siteManagerPhone = managerMatch.phone || '';
					site.siteManager = siteManagerName;
				}
			}
	} catch (error) {
		console.error('Error loading site details:', error);
	}
}

// Checklist is persisted in the database (site_checklist_items table).
// Site progress is derived from checklist completion by the API.
async function loadSiteChecklist() {
	try {
		const response = await fetch(`/api/site-checklist?siteId=${siteId}`);
		if (response.ok) {
			const payload = await response.json();
			checklist = Array.isArray(payload) ? payload : [];
		}
	} catch (error) {
		console.error('Error loading site checklist:', error);
	}
}

// Due date helpers: an item is "Overdue" when its due date is before today,
// and "Due Today" when it falls on today. Completed items are never flagged.
function isChecklistOverdue(item: any): boolean {
	if (!item.dueDate || item.status === 'Completed') return false;
	const today = new Date().toISOString().split('T')[0];
	return item.dueDate.split('T')[0] < today;
}

function isChecklistDueToday(item: any): boolean {
	if (!item.dueDate || item.status === 'Completed') return false;
	const today = new Date().toISOString().split('T')[0];
	return item.dueDate.split('T')[0] === today;
}

async function addChecklistItem() {
	const value = newChecklistItem.trim();
	if (!value) return;

	try {
		const response = await fetch('/api/site-checklist', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				siteId,
				item: value,
				category: newChecklistCategory,
				dueDate: newChecklistDueDate || null
			})
		});

		if (response.ok) {
			const payload = await response.json();
			if (typeof payload?.progress === 'number') {
				site.progress = payload.progress;
			}
			await loadSiteChecklist();
			newChecklistItem = '';
			newChecklistCategory = 'General';
			newChecklistDueDate = '';
			showChecklistForm = false;
		} else {
			const error = await response.json();
			alert(error.error || 'Failed to add checklist item');
		}
	} catch (error) {
		console.error('Error adding checklist item:', error);
		alert('Failed to add checklist item');
	}
}

// Checklist completion modal state
	let showChecklistCommentModal = $state(false);
	let checklistItemToComplete = $state<any>(null);
	let checklistComment = $state('');
	let isSavingChecklistComment = $state(false);

	function toggleChecklistStatus(item: any) {
		if (item.status === 'Completed') {
			// Reopening an item needs no comment
			updateChecklistItemStatus(item, 'Pending', item.comment || '');
			return;
		}
		// Marking complete -> open the comment modal
		checklistItemToComplete = item;
		checklistComment = item.comment || '';
		showChecklistCommentModal = true;
	}

	function closeChecklistCommentModal() {
		showChecklistCommentModal = false;
		checklistItemToComplete = null;
		checklistComment = '';
		isSavingChecklistComment = false;
	}

	async function confirmChecklistCompletion() {
		if (!checklistItemToComplete) return;
		isSavingChecklistComment = true;
		await updateChecklistItemStatus(checklistItemToComplete, 'Completed', checklistComment.trim());
		closeChecklistCommentModal();
	}

	async function updateChecklistItemStatus(item: any, newStatus: string, comment: string) {
	try {
		const response = await fetch(`/api/site-checklist?id=${item.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				status: newStatus,
				comment,
				completedBy: data.user?.id
			})
		});

		if (response.ok) {
			const payload = await response.json();
			if (typeof payload?.progress === 'number') {
				site.progress = payload.progress;
			}
			await loadSiteChecklist();
		} else {
			const error = await response.json();
			alert(error.error || 'Failed to update checklist item');
		}
	} catch (error) {
		console.error('Error updating checklist item:', error);
		alert('Failed to update checklist item');
	}
}

async function removeChecklistItem(itemId: string) {
	if (!confirm('Remove this checklist item?')) return;
	try {
		const response = await fetch(`/api/site-checklist?id=${itemId}`, { method: 'DELETE' });
		if (response.ok) {
			const payload = await response.json();
			if (typeof payload?.progress === 'number') {
				site.progress = payload.progress;
			}
			await loadSiteChecklist();
		} else {
			const error = await response.json();
			alert(error.error || 'Failed to remove checklist item');
		}
	} catch (error) {
		console.error('Error removing checklist item:', error);
		alert('Failed to remove checklist item');
	}
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
			newMemberSpecialization = employee.department?.name || '';
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
		newAttendanceEmployeeId = members[0].id;
		newAttendanceEmployee = members[0].name;
		newAttendanceDate = new Date().toISOString().split('T')[0];
		newAttendanceShift = 'Day Shift';
		newAttendanceStatus = 'Present';
		newAttendanceStartTime = '08:00';
		newAttendanceEndTime = '17:00';
		newAttendanceBreakMinutes = '60';
		newAttendanceNotes = '';
	}

	function closeAttendanceModal() {
		showAttendanceModal = false;
		newAttendanceEmployeeId = '';
		newAttendanceEmployee = '';
		newAttendanceDate = new Date().toISOString().split('T')[0];
		newAttendanceShift = 'Day Shift';
		newAttendanceStatus = 'Present';
		newAttendanceStartTime = '08:00';
		newAttendanceEndTime = '17:00';
		newAttendanceBreakMinutes = '60';
		newAttendanceNotes = '';
	}

	async function handleAddAttendance() {
		if (!newAttendanceEmployeeId) {
			alert('Select an employee assigned to this site');
			return;
		}

		const selectedMember = [...assignedSiteMembers].find((member) => member.id === newAttendanceEmployeeId);
		newAttendanceEmployee = selectedMember?.name || '';
		
		try {
			const response = await fetch('/api/site-attendance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: siteId,
					employeeId: newAttendanceEmployeeId,
					date: newAttendanceDate,
					shift: newAttendanceShift,
					startTime: newAttendanceStartTime,
					endTime: newAttendanceEndTime,
					breakMinutes: newAttendanceBreakMinutes,
					attendanceStatus: newAttendanceStatus,
					notes: newAttendanceNotes || (newAttendanceStatus === 'Sick' ? 'Reported sick and excused from site work.' : 'Attendance recorded for this site.')
				})
			});

			if (response.ok) {
				const data = await response.json();
				const attendanceEntry = {
					...data,
					hoursWorked: Number(data.hoursWorked) || 0,
					employeeName: newAttendanceEmployee,
					role: selectedMember?.role ?? 'Team Member',
					attendanceStatus: data.attendanceStatus || newAttendanceStatus,
					employee: {
						firstname: selectedMember?.name?.split(' ')[0] || '',
						lastname: selectedMember?.name?.split(' ')[1] || ''
					},
					timesheet: data.timesheet || { status: 'Pending' }
				};

				siteAttendance = [attendanceEntry, ...siteAttendance];
				closeAttendanceModal();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to create attendance record');
			}
		} catch (error) {
			console.error('Error creating attendance:', error);
			alert('Failed to create attendance record');
		}
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

	async function handleAddTeamMember() {
		if (!selectedEmployee || !newMemberRole) {
			alert('Please select an employee and a role');
			return;
		}

		const role = constructionRoles.find((r) => r.id === newMemberRole);

		try {
			const response = await fetch('/api/site-team', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId,
					employeeId: selectedEmployee,
					role: role?.name || newMemberRole,
					specialization: newMemberSpecialization,
					phone: newMemberPhone,
					status: newMemberStatus
				})
			});

			if (response.ok) {
				await loadSiteTeam();
				closeTeamMemberModal();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to add team member');
			}
		} catch (error) {
			console.error('Error adding team member:', error);
			alert('Failed to add team member');
		}
	}

	async function removeTeamMember(memberId: string) {
		if (!confirm('Remove this member from the site team?')) return;
		try {
			const response = await fetch(`/api/site-team?id=${memberId}`, { method: 'DELETE' });
			if (response.ok) {
				await loadSiteTeam();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to remove team member');
			}
		} catch (error) {
			console.error('Error removing team member:', error);
			alert('Failed to remove team member');
		}
	}

	function toDateInputValue(value: any): string {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toISOString().split('T')[0];
	}

	function openEditSiteModal() {
		editSite = {
			name: site.name || '',
			location: site.location || '',
			client: site.client || '',
			status: site.status || 'Active',
			startDate: toDateInputValue(site.startDate),
			endDate: toDateInputValue(site.endDate),
			progress: Number(site.progress) || 0,
			siteManagerId: site.siteManagerId ? String(site.siteManagerId) : '',
			value: site.value ? String(site.value) : '',
			projectType: site.projectType || '',
			description: site.description || ''
		};
		showEditSiteModal = true;
	}

	function closeEditSiteModal() {
		showEditSiteModal = false;
		isSavingSite = false;
	}

	async function handleEditSite() {
		if (!editSite.name || !editSite.location || !editSite.client) {
			alert('Site name, location and client are required');
			return;
		}

		isSavingSite = true;
		try {
			const response = await fetch(`/api/sites?id=${siteId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editSite)
			});

			if (response.ok) {
				const payload = await response.json();
				const updated = payload?.data;
				if (updated) {
					site = { ...site, ...updated };
				}
				closeEditSiteModal();
				await loadSiteDetails();
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to update site');
			}
		} catch (error) {
			console.error('Error updating site:', error);
			alert('Failed to update site');
		} finally {
			isSavingSite = false;
		}
	}

	onMount(() => {
		loadEmployees();
		loadSiteDetails();
		loadSiteAttendance();
		loadSiteDocuments();
		loadSiteTeam();
		loadSiteChecklist();
		loadSiteRequests();
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
				<button onclick={openEditSiteModal} class="flex items-center gap-2 px-3 py-2 border border-white/30 text-white text-xs hover:bg-white/10 transition-colors">
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
							class="px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
						>
							Add Attendance
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
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Work Time</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Hours</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Attendance</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Timesheet Status</th>
										<th class="px-4 py-3 text-left font-semibold text-gray-600">Notes</th>
									</tr>
								</thead>
								<tbody>
									{#each siteAttendance as entry}
										<tr class="border-t border-gray-200 hover:bg-gray-50">
											<td class="px-4 py-3 font-medium text-gray-800">{entry.employee?.firstname} {entry.employee?.lastname}</td>
											<td class="px-4 py-3 text-gray-600">{entry.role || 'Team Member'}</td>
											<td class="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
											<td class="px-4 py-3 text-gray-600">{entry.shift}</td>
											<td class="px-4 py-3 text-gray-600">
												{#if entry.startTime && entry.endTime}
													{new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
												{:else}
													--
												{/if}
											</td>
											<td class="px-4 py-3 text-gray-600 font-medium text-[#114a4b]">
												{formatHours(entry.hoursWorked)}
											</td>
											<td class="px-4 py-3"><span class="px-2 py-1 rounded {getStatusColor(entry.attendanceStatus || entry.status)}">{entry.attendanceStatus || entry.status}</span></td>
											<td class="px-4 py-3"><span class="px-2 py-1 rounded {getStatusColor(entry.timesheet?.status || 'Pending')}">{entry.timesheet?.status || 'Pending'}</span></td>
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

					{#if siteManagerName || site.siteManager}
						<div class="flex items-center gap-3 p-4 mb-4 border border-[#5fc5c0]/40 bg-[#5fc5c0]/10 rounded">
							<div class="w-10 h-10 rounded-full bg-[#114a4b] text-white flex items-center justify-center">
								<Icon icon="mdi:account-star" class="w-5 h-5" />
							</div>
							<div class="flex-1">
								<p class="text-xs font-semibold text-gray-800">{siteManagerName || site.siteManager}</p>
								<p class="text-[10px] text-gray-500">Site Manager{siteManagerPhone ? ` · ${siteManagerPhone}` : ''}</p>
							</div>
							<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Active</span>
						</div>
					{/if}

					<!-- Team Members -->
					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-gray-200">
									<th class="text-left py-3 px-4 font-medium text-gray-600">Name</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Phone</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Role</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Status</th>
									<th class="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each siteTeamMembers as member}
									<tr class="border-b border-gray-100 hover:bg-gray-50">
										<td class="py-3 px-4 font-medium text-gray-800">{member.name}</td>
										<td class="py-3 px-4 text-gray-600">{member.phone || '-'}</td>
										<td class="py-3 px-4 text-gray-600">{member.role}</td>
										<td class="py-3 px-4">
											<span class="px-2 py-1 rounded {getStatusColor(member.status)}">{member.status}</span>
										</td>
										<td class="py-3 px-4">
											<button onclick={() => removeTeamMember(member.id)} class="text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
												<Icon icon="mdi:account-remove" class="w-4 h-4" />
												<span>Remove</span>
											</button>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="5" class="py-6 text-center text-gray-500">No team members added yet</td>
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
						<button onclick={openUploadReportModal} class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>New Report</span>
						</button>
					</div>

					<!-- Sub-tabs for report types -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button onclick={() => reportsSubTab = 'Daily'} class="px-3 py-2 text-xs border-b-2 {reportsSubTab === 'Daily' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Daily Reports</button>
							<button onclick={() => reportsSubTab = 'Weekly'} class="px-3 py-2 text-xs border-b-2 {reportsSubTab === 'Weekly' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Weekly Reports</button>
							<button onclick={() => reportsSubTab = 'Monthly'} class="px-3 py-2 text-xs border-b-2 {reportsSubTab === 'Monthly' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Monthly Reports</button>
						</nav>
					</div>

					<!-- Reports Content -->
					{#if filteredReports.length === 0}
						<div class="text-center py-12">
							<Icon icon="mdi:file-chart-outline" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
							<p class="text-sm text-gray-500">No {reportsSubTab.toLowerCase()} reports uploaded yet</p>
						</div>
					{:else}
						<div class="space-y-6">
							{#each reportGroups as group}
								<div>
									<h4 class="text-[10px] font-semibold text-gray-500 uppercase mb-2">{group.date === 'unknown' ? 'Unknown date' : formatDate(group.date)}</h4>
									<div class="space-y-3">
										{#each group.items as report}
											<div class="p-4 border border-gray-200 rounded bg-white">
												<div class="flex items-start justify-between mb-3">
													<div>
														<p class="text-xs font-medium text-gray-800">{report.title}</p>
														<p class="text-[10px] text-gray-500">{site.name}</p>
													</div>
													{#if report.status}
														<span class="text-[10px] px-2 py-1 rounded {getStatusColor(report.status)}">{report.status}</span>
													{/if}
												</div>
												{#if report.description}
													<div class="mb-2">
														<p class="text-[10px] font-medium text-gray-500 mb-1">Summary</p>
														<p class="text-xs text-gray-700">{report.description}</p>
													</div>
												{/if}
												<div class="flex items-center justify-between pt-2 border-t border-gray-100">
													<span class="text-[10px] text-gray-500">By {report.owner?.firstname} {report.owner?.lastname}</span>
													<div class="flex gap-3">
														<button onclick={() => openDocPreview(report)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View Details</button>
														<button onclick={() => downloadSiteDocument(report)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">Download</button>
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if activeTab === 'documents'}
				<!-- Site Documents Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Site Documents</h3>
						<button onclick={openUploadDocumentModal} class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
							<Icon icon="mdi:upload" class="w-4 h-4" />
							<span>Upload</span>
						</button>
					</div>

					<!-- Sub-tabs for document types -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button onclick={() => siteDocumentsSubTab = 'photos'} class="px-3 py-2 text-xs border-b-2 {siteDocumentsSubTab === 'photos' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Photos</button>
							<button onclick={() => siteDocumentsSubTab = 'videos'} class="px-3 py-2 text-xs border-b-2 {siteDocumentsSubTab === 'videos' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Videos</button>
							<button onclick={() => siteDocumentsSubTab = 'documents'} class="px-3 py-2 text-xs border-b-2 {siteDocumentsSubTab === 'documents' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Documents</button>
						</nav>
					</div>

					{#if siteDocumentsSubTab === 'photos'}
						<!-- Photos Content -->
						{#if sitePhotoDocs.length === 0}
							<div class="text-center py-12">
								<Icon icon="mdi:image-off" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<p class="text-sm text-gray-500">No photos uploaded yet</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each sitePhotoGroups as group}
									<div>
										<h4 class="text-[10px] font-semibold text-gray-500 uppercase mb-2">{group.date === 'unknown' ? 'Unknown date' : formatDate(group.date)}</h4>
										<div class="grid grid-cols-4 gap-4">
											{#each group.items as photo}
												<div class="border border-gray-200 rounded bg-white p-3">
													<button onclick={() => openDocPreview(photo)} class="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center w-full overflow-hidden">
														<img src={`/api/documents/${photo.id}?view=true`} alt={photo.fileName} class="w-full h-full object-cover" />
													</button>
													<p class="text-xs font-medium text-gray-800 truncate">{photo.title}</p>
													<p class="text-[10px] text-gray-500">{photo.fileName}</p>
													<div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
														<span class="text-[10px] text-gray-400">{photo.fileSize ? (Number(photo.fileSize) / 1024).toFixed(0) + ' KB' : ''}</span>
														<div class="flex gap-2">
															<button onclick={() => openDocPreview(photo)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">View</button>
															<button onclick={() => downloadSiteDocument(photo)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">Download</button>
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{:else if siteDocumentsSubTab === 'videos'}
						<!-- Videos Content -->
						{#if siteVideoDocs.length === 0}
							<div class="text-center py-12">
								<Icon icon="mdi:video-off" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<p class="text-sm text-gray-500">No videos uploaded yet</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each siteVideoGroups as group}
									<div>
										<h4 class="text-[10px] font-semibold text-gray-500 uppercase mb-2">{group.date === 'unknown' ? 'Unknown date' : formatDate(group.date)}</h4>
										<div class="grid grid-cols-3 gap-4">
											{#each group.items as video}
												<div class="border border-gray-200 rounded bg-white p-3">
													<div class="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
														<Icon icon="mdi:video" class="w-8 h-8 text-gray-400" />
													</div>
													<p class="text-xs font-medium text-gray-800 truncate">{video.title}</p>
													<p class="text-[10px] text-gray-500">{video.fileName}</p>
													<div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
														<span class="text-[10px] text-gray-400">{video.fileSize ? (Number(video.fileSize) / 1024 / 1024).toFixed(1) + ' MB' : ''}</span>
														<button onclick={() => downloadSiteDocument(video)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">Download</button>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<!-- Documents Content -->
						{#if siteOtherDocs.length === 0}
							<div class="text-center py-12">
								<Icon icon="mdi:file-document-outline" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<p class="text-sm text-gray-500">No documents uploaded yet</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each siteOtherDocGroups as group}
									<div>
										<h4 class="text-[10px] font-semibold text-gray-500 uppercase mb-2">{group.date === 'unknown' ? 'Unknown date' : formatDate(group.date)}</h4>
										<div class="space-y-2">
											{#each group.items as doc}
												<div class="flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 transition-colors">
													<div class="flex items-center gap-3">
														<Icon icon="mdi:file-document" class="w-5 h-5 text-gray-600" />
														<div>
															<p class="text-xs font-medium text-gray-800">{doc.title}</p>
															<p class="text-[10px] text-gray-500">{doc.fileName}</p>
														</div>
													</div>
													<div class="flex items-center gap-3">
														{#if doc.status}
															<span class="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded">{doc.status}</span>
														{/if}
														<button onclick={() => openDocPreview(doc)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">Preview</button>
														<button onclick={() => downloadSiteDocument(doc)} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium">Download</button>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				</div>

			{:else if activeTab === 'management'}
				<!-- Management Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Management</h3>
							{#if managementSubTab === 'checklist'}
								<button
									type="button"
									onclick={() => showChecklistForm = !showChecklistForm}
									class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#3bb3b0] transition-colors"
								>
									<Icon icon="mdi:plus" class="w-4 h-4" />
									<span>{showChecklistForm ? 'Close' : 'Add New'}</span>
								</button>
							{/if}
						</div>

						{#if showChecklistForm && managementSubTab === 'checklist'}
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
								<div>
									<label for="checklist-due-date" class="block text-[10px] font-medium text-gray-700 mb-1">Due date</label>
									<input id="checklist-due-date" type="date" bind:value={newChecklistDueDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
								</div>
								<div class="flex justify-end">
									<button type="button" onclick={addChecklistItem} class="px-3 py-2 bg-[#114a4b] text-white text-xs hover:bg-[#0f3b3d] transition-colors">Save item</button>
								</div>
							</div>
						{/if}

						<!-- Sub-tabs for management types -->
						<div class="border-b border-gray-200 mb-4">
							<nav class="flex gap-4">
								<button onclick={() => managementSubTab = 'checklist'} class="px-3 py-2 text-xs border-b-2 {managementSubTab === 'checklist' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Checklist</button>
								<button onclick={() => managementSubTab = 'requests'} class="px-3 py-2 text-xs border-b-2 {managementSubTab === 'requests' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Requests</button>
								<button onclick={() => managementSubTab = 'issues'} class="px-3 py-2 text-xs border-b-2 {managementSubTab === 'issues' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}">Issues</button>
							</nav>
						</div>

						{#if managementSubTab === 'checklist'}
						<!-- Checklist Content -->
						<div class="space-y-3">
							{#each checklist as item}
								<div class="p-4 border rounded bg-white {isChecklistOverdue(item) ? 'border-red-300' : 'border-gray-200'}">
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
											{#if isChecklistOverdue(item)}
												<span class="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 flex items-center gap-1">
													<Icon icon="mdi:alert-circle" class="w-3 h-3" />
													Overdue
												</span>
											{:else if isChecklistDueToday(item)}
												<span class="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
													<Icon icon="mdi:clock-alert" class="w-3 h-3" />
													Due Today
												</span>
											{/if}
											<span class="text-[10px] px-2 py-1 rounded {getStatusColor(item.status)}">{item.status}</span>
											<button type="button" onclick={() => removeChecklistItem(item.id)} class="text-[10px] text-red-500 hover:text-red-700">Remove</button>
										</div>
									</div>
									<div class="flex items-center justify-between pt-2 border-t border-gray-100">
										<span class="text-[10px] text-gray-500">
											{#if item.dueDate}Due: {formatDate(item.dueDate)}{/if}
											{#if item.completedAt} · Completed: {formatDate(item.completedAt)}{/if}
										</span>
									</div>
									{#if item.comment}
										<div class="mt-2 flex items-start gap-1.5 text-[10px] text-gray-600 bg-gray-50 p-2 rounded">
											<Icon icon="mdi:comment-text" class="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
											<span>{item.comment}</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						{:else if managementSubTab === 'requests'}
						<!-- Requests Content -->
						<div>
							<div class="flex items-center justify-between mb-4">
								<h4 class="text-[10px] font-semibold text-gray-500 uppercase">Site Requests</h4>
								<button onclick={openRequestModal} class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
									<Icon icon="mdi:package-variant-plus" class="w-4 h-4" />
									<span>New Request</span>
								</button>
							</div>

							{#if requests.length === 0}
								<div class="bg-gray-50 border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
									No requests yet. Create a material, equipment, labour, service or funds request.
								</div>
							{:else}
								<div class="space-y-3">
									{#each requests as request}
										<div class="p-4 border border-gray-200 rounded bg-white">
											<div class="flex items-start justify-between mb-2 gap-3">
												<div>
													<p class="text-xs font-medium text-gray-800 flex items-center gap-2">
														<Icon icon="mdi:package-variant" class="w-4 h-4 text-gray-500" />
														{request.requestNumber} · {request.requestType}
													</p>
													<p class="text-[10px] text-gray-500 mt-0.5">
														{#if request.neededBy}Needed by {formatDate(request.neededBy)} · {/if}
														Raised {formatDate(request.createdAt)}
													</p>
												</div>
												<div class="flex items-center gap-2">
													<span class="text-[10px] px-2 py-1 rounded {getUrgencyColor(request.urgency)}">{request.urgency}</span>
													<span class="text-[10px] px-2 py-1 rounded {getStatusColor(request.status)}">{request.status}</span>
												</div>
											</div>

											{#if request.reason}
												<p class="text-xs text-gray-600 mb-2">{request.reason}</p>
											{/if}

											<!-- Line items -->
											<div class="border border-gray-100 rounded overflow-hidden mb-3">
												<table class="w-full text-xs">
													<thead class="bg-gray-50">
														<tr>
															<th class="px-3 py-2 text-left font-semibold text-gray-600">Item</th>
															<th class="px-3 py-2 text-right font-semibold text-gray-600">Qty</th>
															<th class="px-3 py-2 text-left font-semibold text-gray-600">Unit</th>
															<th class="px-3 py-2 text-right font-semibold text-gray-600">Est. Price</th>
															<th class="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
														</tr>
													</thead>
													<tbody>
														{#each request.items as line}
															<tr class="border-t border-gray-100">
																<td class="px-3 py-2 text-gray-800">{line.description}</td>
																<td class="px-3 py-2 text-right text-gray-600">{line.quantity}</td>
																<td class="px-3 py-2 text-gray-600">{line.unit || '-'}</td>
																<td class="px-3 py-2 text-right text-gray-600">{line.estimatedPrice ? `MWK ${Number(line.estimatedPrice).toLocaleString()}` : '-'}</td>
																<td class="px-3 py-2 text-right font-medium text-gray-800">{line.estimatedPrice ? `MWK ${(Number(line.quantity) * Number(line.estimatedPrice)).toLocaleString()}` : '-'}</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>

											<div class="flex items-center justify-between pt-2 border-t border-gray-100">
												<span class="text-[10px] font-medium text-gray-700">
													Estimated total: {request.estimatedTotal ? `MWK ${Number(request.estimatedTotal).toLocaleString()}` : '-'}
												</span>
												<div class="flex gap-2">
													{#if request.status === 'Pending'}
														<button onclick={() => updateRequestStatus(request.id, 'approve')} class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium flex items-center gap-1">
															<Icon icon="mdi:check" class="w-3 h-3" /> Approve
														</button>
														<button onclick={() => updateRequestStatus(request.id, 'reject')} class="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium flex items-center gap-1">
															<Icon icon="mdi:close" class="w-3 h-3" /> Reject
														</button>
													{:else if request.status === 'Approved'}
														<button onclick={() => updateRequestStatus(request.id, 'order')} class="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Mark Ordered</button>
													{:else if request.status === 'Ordered'}
														<button onclick={() => updateRequestStatus(request.id, 'deliver')} class="text-[10px] px-2 py-1 rounded bg-cyan-100 text-cyan-700 hover:bg-cyan-200 font-medium">Mark Delivered</button>
													{/if}
													{#if request.status === 'Rejected' && request.rejectionReason}
														<span class="text-[10px] text-red-500">Reason: {request.rejectionReason}</span>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						{:else}
						<!-- Issues Content (placeholder) -->
						<div class="bg-gray-50 border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
							Site issues module coming soon.
						</div>
						{/if}
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
					<button onclick={closeAttendanceModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<div class="space-y-4">
					<div>
						<label for="attendanceEmployee" class="block text-xs font-medium text-gray-700 mb-1">Assigned employee</label>
						<select id="attendanceEmployee" bind:value={newAttendanceEmployeeId} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="">Select employee</option>
							{#each assignedSiteMembers as member}
								<option value={member.id}>{member.name} · {member.role}</option>
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
							<label for="attendanceBreakMinutes" class="block text-xs font-medium text-gray-700 mb-1">Break Minutes</label>
							<input id="attendanceBreakMinutes" type="number" min="0" step="15" bind:value={newAttendanceBreakMinutes} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="attendanceStartTime" class="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
							<input id="attendanceStartTime" type="time" bind:value={newAttendanceStartTime} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						</div>
						<div>
							<label for="attendanceEndTime" class="block text-xs font-medium text-gray-700 mb-1">End Time</label>
							<input id="attendanceEndTime" type="time" bind:value={newAttendanceEndTime} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
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
					<button onclick={closeTeamMemberModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
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

	<!-- Upload Site Report Modal -->
	{#if showUploadReportModal}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div class="bg-white w-full max-w-lg shadow-xl p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-bold text-gray-800">Upload Report</h2>
					<button onclick={closeUploadReportModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<div class="space-y-4">
					<div>
						<label for="reportType" class="block text-xs font-medium text-gray-700 mb-1">Report Type</label>
						<select id="reportType" bind:value={uploadReportType} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Daily">Daily</option>
							<option value="Weekly">Weekly</option>
							<option value="Monthly">Monthly</option>
						</select>
					</div>
					<div>
						<label for="reportFile" class="block text-xs font-medium text-gray-700 mb-1">File *</label>
						<input id="reportFile" type="file" bind:files={uploadReportFile} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="reportTitle" class="block text-xs font-medium text-gray-700 mb-1">Title *</label>
						<input id="reportTitle" type="text" bind:value={uploadReportTitle} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="e.g., Daily Report - Sep 25, 2026" />
					</div>
					<div>
						<label for="reportSummary" class="block text-xs font-medium text-gray-700 mb-1">Summary</label>
						<textarea id="reportSummary" bind:value={uploadReportSummary} rows="3" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Enter a summary of the report"></textarea>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button onclick={closeUploadReportModal} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
					<button onclick={handleUploadSiteReport} disabled={isUploadingReport} class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50">
						{isUploadingReport ? 'Uploading...' : 'Upload'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Upload Site Document Modal -->
	{#if showUploadDocumentModal}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div class="bg-white w-full max-w-lg shadow-xl p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-bold text-gray-800">Upload Site Document</h2>
					<button onclick={closeUploadDocumentModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<div class="space-y-4">
					<div>
						<label for="docFile" class="block text-xs font-medium text-gray-700 mb-1">Files *</label>
						<input id="docFile" type="file" multiple bind:files={uploadDocFile} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						{#if uploadDocFile && uploadDocFile.length > 1}
							<p class="text-[10px] text-gray-500 mt-1">{uploadDocFile.length} files selected. Each will be saved as "Title - filename".</p>
						{/if}
					</div>
					<div>
						<label for="docTitle" class="block text-xs font-medium text-gray-700 mb-1">Title *</label>
						<input id="docTitle" type="text" bind:value={uploadDocTitle} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Enter document title" />
					</div>
					<div>
						<label for="docDescription" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
						<textarea id="docDescription" bind:value={uploadDocDescription} rows="3" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Enter description"></textarea>
					</div>
				</div>

				{#if isUploadingDoc && uploadDocProgress.total > 1}
					<p class="text-[10px] text-gray-500 mt-3">Uploading {uploadDocProgress.done} of {uploadDocProgress.total}...</p>
				{/if}

				<div class="mt-6 flex justify-end gap-3">
					<button onclick={closeUploadDocumentModal} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
					<button onclick={handleUploadSiteDocument} disabled={isUploadingDoc} class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50">
						{isUploadingDoc ? `Uploading${uploadDocProgress.total > 1 ? ` (${uploadDocProgress.done}/${uploadDocProgress.total})` : '...'}` : 'Upload'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Site Document Preview Modal -->
	{#if showDocPreviewModal && previewDoc}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
			<div class="bg-white p-6 max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-sm font-bold text-gray-800">{previewDoc.title}</h2>
					<button onclick={closeDocPreview} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<div class="bg-gray-100 p-4 rounded-md mb-4">
					{#if previewDoc.mimeType?.startsWith('image/')}
						<img src={`/api/documents/${previewDoc.id}?view=true`} alt={previewDoc.fileName} class="max-w-full max-h-[500px] mx-auto" />
					{:else if previewDoc.mimeType === 'application/pdf'}
						<iframe src={`/api/documents/${previewDoc.id}?view=true`} title="PDF Preview" class="w-full h-[500px]"></iframe>
					{:else}
						<p class="text-xs text-gray-500 text-center py-8">
							<Icon icon="mdi:file-document-outline" class="w-12 h-12 mx-auto mb-2" />
							Preview not available for this file type. Please download to view.
						</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3">
					<button onclick={() => downloadSiteDocument(previewDoc)} class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors flex items-center gap-2">
						<Icon icon="mdi:download" class="w-4 h-4" />
						Download
					</button>
					<button onclick={closeDocPreview} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Close</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- New Site Request Modal -->
	{#if showRequestModal}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div class="bg-white w-full max-w-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-sm font-bold text-gray-800 flex items-center gap-2">
						<Icon icon="mdi:package-variant-plus" class="w-5 h-5 text-[#5fc5c0]" />
						New Site Request
					</h2>
					<button onclick={closeRequestModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<div class="grid grid-cols-3 gap-4 mb-4">
					<div>
						<label for="requestType" class="block text-xs font-medium text-gray-700 mb-1">Type</label>
						<select id="requestType" bind:value={newRequestType} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Material">Material</option>
							<option value="Equipment">Equipment</option>
							<option value="Labour">Labour</option>
							<option value="Service">Service</option>
							<option value="Funds">Funds</option>
						</select>
					</div>
					<div>
						<label for="requestUrgency" class="block text-xs font-medium text-gray-700 mb-1">Urgency</label>
						<select id="requestUrgency" bind:value={newRequestUrgency} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Low">Low</option>
							<option value="Normal">Normal</option>
							<option value="High">High</option>
							<option value="Critical">Critical</option>
						</select>
					</div>
					<div>
						<label for="requestNeededBy" class="block text-xs font-medium text-gray-700 mb-1">Needed by</label>
						<input id="requestNeededBy" type="date" bind:value={newRequestNeededBy} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>

				<div class="mb-4">
					<label for="requestReason" class="block text-xs font-medium text-gray-700 mb-1">Reason / justification</label>
					<textarea id="requestReason" bind:value={newRequestReason} rows="2" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="e.g., Cement needed for foundation pouring next week"></textarea>
				</div>

				<!-- Line items -->
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs font-medium text-gray-700">Items</span>
					<button onclick={addRequestItemRow} class="text-[10px] text-[#5fc5c0] hover:text-[#114a4b] font-medium flex items-center gap-1">
						<Icon icon="mdi:plus" class="w-3.5 h-3.5" /> Add item
					</button>
				</div>
				<div class="space-y-2 mb-4">
					{#each newRequestItems as line, i}
						<div class="grid grid-cols-12 gap-2 items-center">
							<input bind:value={line.description} placeholder="Description *" class="col-span-5 px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
							<input bind:value={line.unit} placeholder="Unit (bags, m³)" class="col-span-2 px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
							<input type="number" min="0" step="0.5" bind:value={line.quantity} placeholder="Qty" class="col-span-2 px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
							<input type="number" min="0" bind:value={line.estimatedPrice} placeholder="Price (MWK)" class="col-span-2 px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
							<button onclick={() => removeRequestItemRow(i)} class="col-span-1 text-red-400 hover:text-red-600 flex justify-center" title="Remove item">
								<Icon icon="mdi:delete" class="w-4 h-4" />
							</button>
						</div>
					{/each}
				</div>

				<div class="flex items-center justify-between p-3 bg-gray-50 rounded mb-4">
					<span class="text-xs font-medium text-gray-700">Estimated total</span>
					<span class="text-sm font-bold text-[#114a4b]">MWK {newRequestEstimatedTotal.toLocaleString()}</span>
				</div>

				<div class="flex justify-end gap-3">
					<button onclick={closeRequestModal} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
					<button onclick={handleCreateRequest} disabled={isSavingRequest} class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon icon={isSavingRequest ? 'mdi:loading' : 'mdi:send'} class="w-4 h-4 {isSavingRequest ? 'animate-spin' : ''}" />
						{isSavingRequest ? 'Submitting...' : 'Submit Request'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Checklist Completion Comment Modal -->
	{#if showChecklistCommentModal && checklistItemToComplete}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div class="bg-white w-full max-w-md shadow-xl p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-sm font-bold text-gray-800 flex items-center gap-2">
						<Icon icon="mdi:check-circle" class="w-5 h-5 text-green-500" />
						Complete Checklist Item
					</h2>
					<button onclick={closeChecklistCommentModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<p class="text-xs text-gray-700 mb-1 font-medium">{checklistItemToComplete.item}</p>
				<p class="text-[10px] text-gray-500 mb-4">{checklistItemToComplete.category}</p>

				<div>
					<label for="checklistComment" class="block text-xs font-medium text-gray-700 mb-1">Comment (optional)</label>
					<textarea
						id="checklistComment"
						bind:value={checklistComment}
						rows="4"
						class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						placeholder="e.g., Verified by site engineer, photos attached to documents tab."
					></textarea>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button onclick={closeChecklistCommentModal} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
					<button onclick={confirmChecklistCompletion} disabled={isSavingChecklistComment} class="px-4 py-2 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon icon={isSavingChecklistComment ? 'mdi:loading' : 'mdi:check'} class="w-4 h-4 {isSavingChecklistComment ? 'animate-spin' : ''}" />
						{isSavingChecklistComment ? 'Saving...' : 'Mark Complete'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Edit Site Modal -->
	{#if showEditSiteModal}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div class="bg-white w-full max-w-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
						<Icon icon="mdi:pencil" class="w-5 h-5 text-[#5fc5c0]" />
						Edit Site
					</h2>
					<button onclick={closeEditSiteModal} class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="col-span-2">
						<label for="editSiteName" class="block text-xs font-medium text-gray-700 mb-1">Site Name *</label>
						<input id="editSiteName" type="text" bind:value={editSite.name} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Enter site name" />
					</div>
					<div>
						<label for="editSiteLocation" class="block text-xs font-medium text-gray-700 mb-1">Location *</label>
						<input id="editSiteLocation" type="text" bind:value={editSite.location} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="e.g., Lilongwe" />
					</div>
					<div>
						<label for="editSiteClient" class="block text-xs font-medium text-gray-700 mb-1">Client *</label>
						<input id="editSiteClient" type="text" bind:value={editSite.client} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Client name" />
					</div>
					<div>
						<label for="editSiteStatus" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
						<select id="editSiteStatus" bind:value={editSite.status} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Active">Active</option>
							<option value="In Progress">In Progress</option>
							<option value="On Hold">On Hold</option>
							<option value="Completed">Completed</option>
						</select>
					</div>
					<div>
						<label for="editSiteProjectType" class="block text-xs font-medium text-gray-700 mb-1">Project Type</label>
						<select id="editSiteProjectType" bind:value={editSite.projectType} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="">Select type</option>
							<option value="Construction">Construction</option>
							<option value="Infrastructure">Infrastructure</option>
							<option value="Renovation">Renovation</option>
						</select>
					</div>
					<div>
						<label for="editSiteStartDate" class="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
						<input id="editSiteStartDate" type="date" bind:value={editSite.startDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editSiteEndDate" class="block text-xs font-medium text-gray-700 mb-1">End Date</label>
						<input id="editSiteEndDate" type="date" bind:value={editSite.endDate} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editSiteProgress" class="block text-xs font-medium text-gray-700 mb-1">Progress (%)</label>
						<input id="editSiteProgress" type="number" min="0" max="100" bind:value={editSite.progress} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editSiteValue" class="block text-xs font-medium text-gray-700 mb-1">Project Value (MWK)</label>
						<input id="editSiteValue" type="number" min="0" bind:value={editSite.value} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="e.g., 50000000" />
					</div>
					<div class="col-span-2">
						<label for="editSiteManager" class="block text-xs font-medium text-gray-700 mb-1">Site Manager</label>
						<select id="editSiteManager" bind:value={editSite.siteManagerId} class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="">Select site manager</option>
							{#each realEmployees as employee}
								<option value={String(employee.id)}>{employee.firstname} {employee.lastname}</option>
							{/each}
						</select>
					</div>
					<div class="col-span-2">
						<label for="editSiteDescription" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
						<textarea id="editSiteDescription" bind:value={editSite.description} rows="3" class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" placeholder="Enter project description"></textarea>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button onclick={closeEditSiteModal} class="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
					<button onclick={handleEditSite} disabled={isSavingSite} class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon icon={isSavingSite ? 'mdi:loading' : 'mdi:content-save'} class="w-4 h-4 {isSavingSite ? 'animate-spin' : ''}" />
						{isSavingSite ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
