<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	// Get tender ID from URL
	const tenderId = $page.params.id;

	// Tender data state
	let tender = $state<any>(null);
	let loading = $state(true);
	let error = $state('');

	// Workflow stages
	let workflowStages = $state<any[]>([]);
	let documentTypes = $state<any[]>([]);
	let notice = $state('');

	function showNotice(message: string) {
		notice = message;
		toast.success(message);
		window.setTimeout(() => notice = '', 3000);
	}

	function normalizeStageStatus(status: string) {
		return status === 'Completed' ? 'completed' : status === 'In Progress' ? 'inProgress' : 'pending';
	}

	function mapTenderData(data: any) {
		teamMembers = (data.teamMembers || []).map((member: any) => ({
			...member,
			name: `${member.employee?.firstname || member.employee?.user?.firstname || ''} ${member.employee?.lastname || member.employee?.user?.lastname || ''}`.trim(),
			responsibility: member.responsibilities || 'Assigned construction work'
		}));
		requirements = (data.requirements || []).map((requirement: any) => ({
			...requirement,
			name: requirement.item,
			status: requirement.status === 'Completed' ? 'complete' : requirement.status === 'In Progress' ? 'inProgress' : 'pending',
			responsible: requirement.assignee ? `${requirement.assignee.firstname} ${requirement.assignee.lastname}` : 'Unassigned',
			mandatory: false
		}));
		const tenderDocuments = (data.documents || []).map((document: any) => ({
			...document,
			id: String(document.id),
			name: document.fileName || document.title,
			category: document.documentType?.name || 'Construction',
			version: String(document.version || 1),
			uploadedBy: document.owner ? `${document.owner.firstname} ${document.owner.lastname}` : 'Unknown',
			uploadedDate: document.createdAt,
			comments: document.description || '',
			status: document.status
		}));
		documents = tenderDocuments.filter((document: any) => !document.isTemplate);
		communications = (data.communications || []).map((communication: any) => ({
			...communication,
			id: String(communication.id),
			type: communication.isInternal ? 'Internal' : 'External',
			sender: communication.sender ? `${communication.sender.firstname} ${communication.sender.lastname}` : 'Unknown',
			recipient: communication.recipient ? `${communication.recipient.firstname} ${communication.recipient.lastname}` : 'Construction team',
			date: communication.createdAt,
			status: communication.status
		}));
		activityLog = [
			{ id: `tender-${data.id}`, action: 'Tender created', user: 'System', date: data.createdAt, details: 'Construction tender registered' },
			...(data.workflowStages || []).filter((stage: any) => stage.completedAt).map((stage: any) => ({ id: `stage-${stage.id}`, action: 'Workflow stage completed', user: stage.completedByUser ? `${stage.completedByUser.firstname} ${stage.completedByUser.lastname}` : 'System', date: stage.completedAt, details: stage.stageName })),
			...(data.documents || []).map((document: any) => ({ id: `document-${document.id}`, action: document.isTemplate ? 'Template uploaded' : 'Document uploaded', user: document.owner ? `${document.owner.firstname} ${document.owner.lastname}` : 'System', date: document.createdAt, details: document.fileName || document.title })),
			...(data.communications || []).map((communication: any) => ({ id: `communication-${communication.id}`, action: 'Message sent', user: communication.sender ? `${communication.sender.firstname} ${communication.sender.lastname}` : 'System', date: communication.createdAt, details: communication.subject }))
		].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
		workflowStages = (data.workflowStages || []).map((stage: any) => ({ ...stage, status: normalizeStageStatus(stage.status) }));
		templates = tenderDocuments.filter((document: any) => document.isTemplate).map((document: any) => ({ ...document, description: document.comments || '' }));
		isSubmitted = data.status === 'Submitted';
		submissionDate = data.submissionDate;
	}

	// Fetch tender data from API
	async function fetchTender() {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/tenders/${tenderId}`);
			const result = await response.json();

			if (result.success) {
				tender = result.data;
				mapTenderData(result.data);
			} else {
				error = result.error || 'Failed to load tender';
				tender = null;
			}
		} catch (err) {
			error = 'Failed to load tender';
			tender = null;
		} finally {
			loading = false;
		}
	}

	async function fetchEmployees() {
		try {
			const response = await fetch('/api/employees');
			if (response.ok) {
				availableEmployees = await response.json();
			}
		} catch (error) {
		}
	}

	async function fetchDocumentTypes() {
		try {
			const response = await fetch('/api/documents/types');
			if (response.ok) documentTypes = await response.json();
		} catch (error) {
		}
	}

	async function seedWorkflowStages() {
		try {
			const response = await fetch(`/api/tenders/${tenderId}/workflow-stages/seed`, {
				method: 'POST'
			});
			const result = await response.json();
			if (result.success) {
				await fetchTender();
				showNotice('Default construction workflow restored');
			} else {
							toast.error(result.error || 'Failed to create workflow stages');
			}
		} catch (error) {
					toast.error('Failed to create workflow stages');
		}
	}

	function openWorkflowModal() {
		showWorkflowModal = true;
		workflowStagesInput = '';
	}

	function closeWorkflowModal() {
		showWorkflowModal = false;
		workflowStagesInput = '';
	}

	async function handleCreateCustomWorkflow() {
		if (!workflowStagesInput.trim()) {
			toast.error('Please enter workflow stages (one per line)');
			return;
		}

		const stages = workflowStagesInput
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);

		if (stages.length === 0) {
			toast.error('Please enter at least one workflow stage');
			return;
		}

		try {
			isCreatingWorkflow = true;
			const response = await fetch(`/api/tenders/${tenderId}/workflow-stages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ stages })
			});
			const result = await response.json();
			if (result.success) {
				await fetchTender();
				closeWorkflowModal();
				showNotice('Custom construction workflow saved');
			} else {
							toast.error(result.error || 'Failed to create custom workflow');
			}
		} catch (error) {
			toast.error('Failed to create custom workflow');
		} finally {
			isCreatingWorkflow = false;
		}
	}

	onMount(() => {
		fetchTender();
		fetchEmployees();
		fetchDocumentTypes();
	});

	// Tabs
	let activeTab = $state('overview');
	const tabs = [
		{ id: 'overview', label: 'Overview', icon: 'mdi:view-dashboard' },
		{ id: 'workflow', label: 'Workflow', icon: 'mdi:progress-clock' },
		{ id: 'team', label: 'Team', icon: 'mdi:account-group' },
		{ id: 'requirements', label: 'Requirements', icon: 'mdi:clipboard-check' },
		{ id: 'documents', label: 'Documents', icon: 'mdi:folder' },
		{ id: 'communication', label: 'Communication', icon: 'mdi:message-text' },
		{ id: 'approvals', label: 'Approvals', icon: 'mdi:check-circle' },
		{ id: 'submission', label: 'Submission', icon: 'mdi:send' },
		{ id: 'activity', label: 'Activity', icon: 'mdi:history' }
	];

	// Sample data for different tabs
	let showTeamMemberModal = $state(false);
	let selectedEmployee = $state('');
	let selectedRole = $state('');
	let selectedResponsibility = $state('');
	let isAddingTeamMember = $state(false);

	let showRequirementModal = $state(false);
	let selectedRequirements = $state<string[]>([]);
	let newRequirementCategory = $state('Administrative');
	let newRequirementMandatory = $state(true);
	let newRequirementResponsible = $state('');
	let isAddingRequirement = $state(false);
	let isAddingNewRequirement = $state(false);
	let newRequirementName = $state('');

	// Template modal state
	let showTemplateModal = $state(false);
	let templateName = $state('');
	let templateCategory = $state('Administrative');
	let templateDescription = $state('');
	let templateFile = $state<File | null>(null);
	let isAddingTemplate = $state(false);

	// Document upload modal state
	let showUploadModal = $state(false);
	let uploadDocumentName = $state('');
	let uploadComments = $state('');
	let uploadFile = $state<File | null>(null);
	let uploadStatus = $state('Draft');
	let isUploadingDocument = $state(false);

	// Workflow modal state
	let showWorkflowModal = $state(false);
	let workflowStagesInput = $state('');
	let isCreatingWorkflow = $state(false);

	// Document rejection modal state
	let showRejectModal = $state(false);
	let rejectDocumentId = $state<string | null>(null);
	let rejectComments = $state('');

	// Communication modal state
	let showCommunicationModal = $state(false);
	let communicationSubject = $state('');
	let communicationMessage = $state('');
	let isSendingCommunication = $state(false);

	// Communication details modal state
	let showCommunicationDetailsModal = $state(false);
	let selectedCommunication = $state<any>(null);

	// Submission state
	let isSubmitted = $state(false);
	let submissionDate = $state<string | null>(null);

	// Sample communications data
	let communications = $state<any[]>([
		{ id: '1', type: 'Internal', subject: 'BOQ Review Meeting', message: 'Team meeting scheduled for tomorrow at 10am to review the BOQ and pricing strategy.', sender: 'John Banda', recipient: 'Team', date: '2026-08-08', status: 'Sent' },
		{ id: '2', type: 'Internal', subject: 'Document Approval Status', message: 'Please review the pending documents in the Approvals tab. We need all documents approved by Friday.', sender: 'James Zulu', recipient: 'Team', date: '2026-08-10', status: 'Sent' },
		{ id: '3', type: 'Internal', subject: 'Requirements Update', message: 'New requirements have been added to the tender. Please review and assign team members accordingly.', sender: 'Mary Chirwa', recipient: 'Team', date: '2026-08-12', status: 'Sent' },
		{ id: '4', type: 'Internal', subject: 'Submission Preparation', message: 'All documents must be finalized by Wednesday for final review before submission.', sender: 'John Banda', recipient: 'Team', date: '2026-08-13', status: 'Sent' }
	]);

	// Master list of standard construction bidding requirements
	let masterRequirements = $state([
		{ id: '1', category: 'Administrative', name: 'Certificate of Incorporation', mandatory: true },
		{ id: '2', category: 'Administrative', name: 'Tax Clearance Certificate', mandatory: true },
		{ id: '3', category: 'Administrative', name: 'Company Profile', mandatory: true },
		{ id: '4', category: 'Administrative', name: 'Business License', mandatory: true },
		{ id: '5', category: 'Administrative', name: 'VAT Registration', mandatory: true },
		{ id: '6', category: 'Administrative', name: 'NRA Registration', mandatory: true },
		{ id: '7', category: 'Administrative', name: 'Power of Attorney', mandatory: false },
		{ id: '8', category: 'Technical', name: 'Similar Projects Experience', mandatory: true },
		{ id: '9', category: 'Technical', name: 'Key Personnel CVs', mandatory: true },
		{ id: '10', category: 'Technical', name: 'Equipment List', mandatory: true },
		{ id: '11', category: 'Technical', name: 'Method Statement', mandatory: true },
		{ id: '12', category: 'Technical', name: 'Work Program/Schedule', mandatory: true },
		{ id: '13', category: 'Technical', name: 'Quality Assurance Plan', mandatory: true },
		{ id: '14', category: 'Technical', name: 'Health & Safety Plan', mandatory: true },
		{ id: '15', category: 'Technical', name: 'Environmental Management Plan', mandatory: false },
		{ id: '16', category: 'Financial', name: 'Audited Accounts (3 years)', mandatory: true },
		{ id: '17', category: 'Financial', name: 'Bid Security', mandatory: true },
		{ id: '18', category: 'Financial', name: 'Bank Statement', mandatory: true },
		{ id: '19', category: 'Financial', name: 'Tax Compliance Certificate', mandatory: true },
		{ id: '20', category: 'Financial', name: 'Financial Proposal Form', mandatory: true },
		{ id: '21', category: 'Financial', name: 'Price Schedule', mandatory: true },
		{ id: '22', category: 'Financial', name: 'Insurance Certificates', mandatory: true }
	]);

	// Sample employees to select from
	let availableEmployees = $state<any[]>([
		{ id: '1', name: 'John Banda', department: 'Management' },
		{ id: '2', name: 'Peter Phiri', department: 'Quantity Surveying' },
		{ id: '3', name: 'Mary Chirwa', department: 'Engineering' },
		{ id: '4', name: 'James Zulu', department: 'Finance' },
		{ id: '5', name: 'Sarah Mwale', department: 'Engineering' },
		{ id: '6', name: 'David Kachere', department: 'Legal' },
		{ id: '7', name: 'Grace Phiri', department: 'Administration' },
		{ id: '8', name: 'Michael Banda', department: 'Procurement' }
	]);

	// Available roles
	let availableRoles = $state([
		'Bid Manager',
		'Quantity Surveyor',
		'Engineer',
		'Finance Manager',
		'Legal Advisor',
		'Procurement Officer',
		'Technical Writer',
		'Administrator'
	]);

	let teamMembers = $state<any[]>([
		{ id: '1', name: 'John Banda', role: 'Bid Manager', responsibility: 'Overall Bid Coordination', status: 'Active' },
		{ id: '2', name: 'Peter Phiri', role: 'Quantity Surveyor', responsibility: 'BOQ & Pricing', status: 'Active' },
		{ id: '3', name: 'Mary Chirwa', role: 'Engineer', responsibility: 'Technical Proposal', status: 'Active' },
		{ id: '4', name: 'James Zulu', role: 'Finance Manager', responsibility: 'Financial Documents', status: 'Active' }
	]);

	let requirements = $state<any[]>([
		{ id: '1', category: 'Administrative', name: 'Certificate of Incorporation', status: 'complete', mandatory: true, responsible: 'John Banda' },
		{ id: '2', category: 'Administrative', name: 'Tax Clearance Certificate', status: 'complete', mandatory: true, responsible: 'John Banda' },
		{ id: '3', category: 'Administrative', name: 'Company Profile', status: 'complete', mandatory: true, responsible: 'John Banda' },
		{ id: '8', category: 'Technical', name: 'Similar Projects Experience', status: 'complete', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '9', category: 'Technical', name: 'Key Personnel CVs', status: 'complete', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '10', category: 'Technical', name: 'Equipment List', status: 'inProgress', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '11', category: 'Technical', name: 'Method Statement', status: 'pending', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '16', category: 'Financial', name: 'Audited Accounts (3 years)', status: 'complete', mandatory: true, responsible: 'James Zulu' },
		{ id: '17', category: 'Financial', name: 'Bid Security', status: 'inProgress', mandatory: true, responsible: 'James Zulu' },
		{ id: '18', category: 'Financial', name: 'Bank Statement', status: 'complete', mandatory: true, responsible: 'James Zulu' }
	]);

	let documents = $state<any[]>([
		{ id: '1', name: 'Tender Notice.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-01', comments: '', status: 'Approved' },
		{ id: '2', name: 'Company Registration.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-02', comments: 'Updated with latest registration', status: 'Approved' },
		{ id: '3', name: 'Tax Clearance.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-02', comments: '', status: 'Approved' },
		{ id: '4', name: 'Method Statement v2.docx', category: 'Technical', version: '2', uploadedBy: 'Mary Chirwa', uploadedDate: '2026-08-10', comments: 'Revised based on client feedback', status: 'Pending review' },
		{ id: '5', name: 'BOQ.xlsx', category: 'Financial', version: '3', uploadedBy: 'Peter Phiri', uploadedDate: '2026-08-12', comments: 'Final version for submission', status: 'Draft' }
	]);

	let documentSubTab = $state('documents');
	let templates = $state<any[]>([
		{ id: '1', name: 'Company Profile Template.docx', category: 'Administrative', description: 'Standard company profile for bidding', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '2', name: 'Technical Proposal Template.pptx', category: 'Technical', description: 'Technical proposal presentation template', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '3', name: 'Financial Proposal Template.xlsx', category: 'Financial', description: 'Financial proposal spreadsheet template', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '4', name: 'Method Statement Template.docx', category: 'Technical', description: 'Method statement document template', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '5', name: 'CV Template.docx', category: 'Administrative', description: 'Key personnel CV template', uploadedBy: 'System', uploadedDate: '2026-01-15' }
	]);

	let activityLog = $state<any[]>([]);

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

	function workflowStatusFor(stage: any, index: number) {
		if (stage.status === 'completed') return 'Completed';
		if (index === workflowStages.findIndex(item => item.status !== 'completed')) return 'In Progress';
		return 'Pending';
	}

	const nextStageIndex = $derived(workflowStages.findIndex((stage) => stage.status !== 'completed'));
	const completedStageCount = $derived(workflowStages.filter((stage) => stage.status === 'completed').length);
	const workflowProgress = $derived(workflowStages.length ? Math.round((completedStageCount / workflowStages.length) * 100) : 0);
	const completedStageBoundary = $derived(nextStageIndex === -1 ? workflowStages.length : nextStageIndex);
	const approvedDocumentCount = $derived(documents.filter((document) => document.status === 'Approved').length);
	const pendingRequirementCount = $derived(requirements.filter((requirement) => requirement.status !== 'complete').length);

	function canUpdateStage(index: number) {
		return index <= nextStageIndex || (nextStageIndex === -1 && index === workflowStages.length - 1);
	}

	async function updateWorkflowStage(stage: any, index: number) {
		try {
			const nextStatus = workflowStatusFor(stage, index) === 'Completed' ? 'Pending' : 'Completed';
			const response = await fetch(`/api/tenders/${tenderId}/workflow-stages/${stage.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: nextStatus })
			});
			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to update workflow stage');
			}
			await fetchTender();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update workflow stage');
		}
	}

	async function setWorkflowStageStatus(stage: any, status: string) {
		try {
			const stageIndex = workflowStages.findIndex((item) => item.id === stage.id);
			if (!canUpdateStage(stageIndex)) {
				toast.info('Complete the previous workflow stage first');
				return;
			}
			const response = await fetch(`/api/tenders/${tenderId}/workflow-stages/${stage.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to update workflow stage');
			}
			await fetchTender();
			showNotice('Workflow progress updated');
		} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Failed to update workflow stage');
		}
	}

	async function moveWorkflowStage(index: number, direction: number) {
		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= workflowStages.length) return;
		const stageIds = workflowStages.map((stage) => stage.id);
		[stageIds[index], stageIds[nextIndex]] = [stageIds[nextIndex], stageIds[index]];
		const response = await fetch(`/api/tenders/${tenderId}/workflow-stages`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ stageIds })
		});
		if (!response.ok) {
			const result = await response.json();
			toast.error(result.error || 'Failed to reorder workflow stages');
			return;
		}
		await fetchTender();
		showNotice('Workflow order updated');
	}

	async function removeWorkflowStage(stage: any) {
		if (!confirm(`Remove the ${stage.stageName} stage?`)) return;
		const response = await fetch(`/api/tenders/${tenderId}/workflow-stages/${stage.id}`, { method: 'DELETE' });
		if (!response.ok) {
			const result = await response.json();
			toast.error(result.error || 'Failed to remove workflow stage');
			return;
		}
		await fetchTender();
		showNotice('Workflow stage removed');
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

	function openTeamMemberModal() {
		showTeamMemberModal = true;
		selectedEmployee = '';
		selectedRole = '';
		selectedResponsibility = '';
	}

	function closeTeamMemberModal() {
		showTeamMemberModal = false;
		selectedEmployee = '';
		selectedRole = '';
		selectedResponsibility = '';
	}

	async function handleAddTeamMember() {
		if (!selectedEmployee || !selectedRole || !selectedResponsibility) {
			toast.error('Please select an employee, role, and enter a responsibility');
			return;
		}

		try {
			isAddingTeamMember = true;
			const response = await fetch(`/api/tenders/${tenderId}/team`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ employeeId: selectedEmployee, role: selectedRole, responsibilities: selectedResponsibility })
		});
		if (!response.ok) throw new Error('Failed to add team member');
		await fetchTender();
		showNotice('Construction team member assigned');
			closeTeamMemberModal();
		} catch (error) {
			toast.error('Failed to add team member');
		} finally {
			isAddingTeamMember = false;
		}
	}

	function openRequirementModal() {
		showRequirementModal = true;
		selectedRequirements = [];
		newRequirementCategory = 'Administrative';
		newRequirementMandatory = true;
		newRequirementResponsible = '';
		isAddingNewRequirement = false;
		newRequirementName = '';
	}

	function closeRequirementModal() {
		showRequirementModal = false;
		selectedRequirements = [];
		newRequirementCategory = 'Administrative';
		newRequirementMandatory = true;
		newRequirementResponsible = '';
		isAddingNewRequirement = false;
		newRequirementName = '';
	}

	function toggleRequirementSelection(reqName: string) {
		if (selectedRequirements.includes(reqName)) {
			selectedRequirements = selectedRequirements.filter(r => r !== reqName);
		} else {
			selectedRequirements = [...selectedRequirements, reqName];
		}
	}

	function handleRequirementNameChange(value: string) {
		newRequirementName = value;
		if (value === '__new__') {
			isAddingNewRequirement = true;
			newRequirementName = '';
		} else {
			isAddingNewRequirement = false;
			// Auto-fill category and mandatory from master list
			const masterReq = masterRequirements.find(m => m.name === value);
			if (masterReq) {
				newRequirementCategory = masterReq.category;
				newRequirementMandatory = masterReq.mandatory;
			}
		}
	}

	async function handleAddRequirement() {
		if (!newRequirementResponsible) {
			toast.error('Please select a responsible person');
			return;
		}

		if (selectedRequirements.length === 0 && !newRequirementName) {
			toast.error('Please select at least one requirement or add a new one');
			return;
		}

		try {
			isAddingRequirement = true;

			const pendingRequirements = [];
			// Add selected requirements
			for (const reqName of selectedRequirements) {
				const masterReq = masterRequirements.find(m => m.name === reqName);
				if (masterReq && !requirements.find(r => r.name === reqName)) {
					pendingRequirements.push({ category: masterReq.category, item: masterReq.name, assignedTo: newRequirementResponsible });
				}
			}

			// Add custom requirement if provided
			if (newRequirementName && isAddingNewRequirement) {
				pendingRequirements.push({ category: newRequirementCategory, item: newRequirementName, assignedTo: newRequirementResponsible });
			}
			for (const requirement of pendingRequirements) {
				const response = await fetch(`/api/tenders/${tenderId}/requirements`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requirement)
				});
				if (!response.ok) throw new Error('Failed to save requirement');
			}
			await fetchTender();
			showNotice('Construction requirements saved');

			closeRequirementModal();
		} catch (error) {
			toast.error('Failed to add requirement');
		} finally {
			isAddingRequirement = false;
		}
	}

	function toggleRequirementStatus(reqId: string) {
		const requirement = requirements.find(req => req.id === reqId);
		if (!requirement) return;
		fetch(`/api/tenders/${tenderId}/requirements/${reqId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: requirement.status === 'complete' ? 'Pending' : 'Completed' })
		}).then(response => {
			if (!response.ok) throw new Error('Failed to update requirement');
			return fetchTender();
		}).catch(error => toast.error(error.message));
	}

	async function addMasterRequirement(masterReq: any) {
		const existing = requirements.find(r => r.name === masterReq.name);
		if (!existing) {
			const assignee = teamMembers[0]?.employee?.user?.id || teamMembers[0]?.employee?.userId;
			const response = await fetch(`/api/tenders/${tenderId}/requirements`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ category: masterReq.category, item: masterReq.name, assignedTo: assignee || null })
			});
			if (!response.ok) throw new Error('Failed to add standard requirement');
			await fetchTender();
			showNotice('Standard construction requirement added');
		}
	}

	// Template modal functions
	function openTemplateModal() {
		showTemplateModal = true;
		templateName = '';
		templateCategory = 'Administrative';
		templateDescription = '';
		templateFile = null;
	}

	function closeTemplateModal() {
		showTemplateModal = false;
		templateName = '';
		templateCategory = 'Administrative';
		templateDescription = '';
		templateFile = null;
	}

	function handleTemplateFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			templateFile = target.files[0];
			templateName = templateFile.name;
		}
	}

	async function handleAddTemplate() {
		if (!templateFile && !templateName) {
			toast.error('Please select a file or enter template name');
			return;
		}

		if (!templateDescription) {
			toast.error('Please enter template description');
			return;
		}

		try {
			isAddingTemplate = true;
			if (!templateFile) throw new Error('Select a template file');
			const formData = new FormData();
			formData.append('file', templateFile);
			formData.append('title', templateName || templateFile.name);
			formData.append('description', templateDescription);
			formData.append('ownerId', '1');
			formData.append('tenderId', tender.id);
			formData.append('isTemplate', 'true');
			const response = await fetch('/api/documents', { method: 'POST', body: formData });
			if (!response.ok) throw new Error('Failed to save template');
			await fetchTender();
			showNotice('Construction template saved');
			closeTemplateModal();
		} catch (error) {
			toast.error('Failed to add template');
		} finally {
			isAddingTemplate = false;
		}
	}

	// Document upload modal functions
	function openUploadModal() {
		showUploadModal = true;
		uploadDocumentName = '';
		uploadComments = '';
		uploadFile = null;
		uploadStatus = 'Draft';
	}

	function closeUploadModal() {
		showUploadModal = false;
		uploadDocumentName = '';
		uploadComments = '';
		uploadFile = null;
		uploadStatus = 'Draft';
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			uploadFile = target.files[0];
			uploadDocumentName = uploadFile.name;
		}
	}

	async function handleUploadDocument() {
		if (!uploadFile && !uploadDocumentName) {
			toast.error('Please select a file or enter document name');
			return;
		}

		try {
			isUploadingDocument = true;
			if (!uploadFile) throw new Error('Select a file to upload');
			const formData = new FormData();
			formData.append('file', uploadFile);
			formData.append('title', uploadDocumentName || uploadFile.name);
			formData.append('description', uploadComments);
			formData.append('ownerId', '1');
			formData.append('tenderId', tender.id);
			formData.append('status', uploadStatus);
			const response = await fetch('/api/documents', { method: 'POST', body: formData });
			if (!response.ok) throw new Error('Failed to upload document');
			await fetchTender();
			showNotice('Construction document uploaded');
			closeUploadModal();
		} catch (error) {
			toast.error('Failed to upload document');
		} finally {
			isUploadingDocument = false;
		}
	}

	// Document rejection modal functions
	function openRejectModal(docId: string) {
		showRejectModal = true;
		rejectDocumentId = docId;
		rejectComments = '';
	}

	function closeRejectModal() {
		showRejectModal = false;
		rejectDocumentId = null;
		rejectComments = '';
	}

	async function handleRejectDocument() {
		if (!rejectDocumentId) return;

		await fetch(`/api/documents/${rejectDocumentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Rejected', description: rejectComments }) });
		await fetchTender();
		closeRejectModal();
	}

	// Communication modal functions
	function openCommunicationModal() {
		showCommunicationModal = true;
		communicationSubject = '';
		communicationMessage = '';
	}

	function closeCommunicationModal() {
		showCommunicationModal = false;
		communicationSubject = '';
		communicationMessage = '';
	}

	async function handleSendCommunication() {
		if (!communicationSubject || !communicationMessage) {
			toast.error('Please enter subject and message');
			return;
		}

		try {
			isSendingCommunication = true;
			const response = await fetch(`/api/tenders/${tenderId}/communications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: communicationSubject, message: communicationMessage }) });
			if (!response.ok) throw new Error('Failed to send communication');
			await fetchTender();
			showNotice('Construction team message sent');
			closeCommunicationModal();
		} catch (error) {
			toast.error('Failed to send communication');
		} finally {
			isSendingCommunication = false;
		}
	}

	// Communication details modal functions
	function openCommunicationDetailsModal(comm: any) {
		selectedCommunication = comm;
		showCommunicationDetailsModal = true;
	}

	function closeCommunicationDetailsModal() {
		showCommunicationDetailsModal = false;
		selectedCommunication = null;
	}

	// Submission function
	async function handleSubmitBid() {
		const approvedDocs = documents.filter(d => d.status === 'Approved');
		if (approvedDocs.length === 0) {
			toast.error('No approved documents to submit. Please approve documents in the Approvals tab.');
			return;
		}
		const date = new Date().toISOString();
		const response = await fetch(`/api/tenders/${tenderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Submitted', submissionDate: date, progress: 100 }) });
		if (!response.ok) throw new Error('Failed to submit bid');
		await fetchTender();
		showNotice('Construction bid submitted');
	}
</script>

<div class="p-6">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Icon icon="mdi:loading" class="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
				<p class="text-sm text-gray-500">Loading tender details...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Icon icon="mdi:alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-4" />
				<p class="text-sm text-gray-500">{error}</p>
				<button onclick={fetchTender} class="mt-4 px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors">
					Retry
				</button>
			</div>
		</div>
	{:else if !tender}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<Icon icon="mdi:alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-4" />
				<p class="text-sm text-gray-500">Tender not found</p>
			</div>
		</div>
	{:else}
	<div class="bg-[#114a4b] text-white p-5 mb-6 shadow">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<h1 class="text-lg font-semibold">{tender.title}</h1>
				<p class="text-xs text-white/75 mt-1">{tender.client} · Tender No: {tender.tenderNumber}</p>
				<p class="text-[10px] uppercase tracking-widest text-[#a8e2de]">Construction bid progress</p>
				<p class="text-lg font-semibold mt-1">{workflowProgress}% complete</p>
				<p class="text-xs text-white/75 mt-1">
					{#if nextStageIndex === -1}
						Workflow complete. No workflow stages remain.
					{:else}
						Next action: {workflowStages[nextStageIndex]?.stageName || 'Configure the workflow'}
					{/if}
				</p>
			</div>
			<div class="w-full lg:max-w-md">
				<div class="flex items-center justify-between text-[10px] text-white/75 mb-2">
					<span>{completedStageCount} of {workflowStages.length} stages complete</span>
					<span>{approvedDocumentCount}/{documents.length} documents approved</span>
				</div>
				<div class="h-2 bg-white/20 rounded-full overflow-hidden">
					<div class="h-full bg-[#a8e2de] rounded-full transition-all duration-500" style={`width: ${workflowProgress}%`}></div>
				</div>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/25 text-xs sm:grid-cols-4">
			<div>
				<span class="text-white/70">Closing Date</span>
				<p class="font-medium mt-1">{formatDate(tender.closingDate)}</p>
			</div>
			<div>
				<span class="text-white/70">Estimated Value</span>
				<p class="font-medium mt-1">{formatValue(Number(tender.value || 0))}</p>
			</div>
			<div>
				<span class="text-white/70">Status</span>
				<p class="font-medium mt-1">{tender.status}</p>
			</div>
			<div>
				<span class="text-white/70">Progress</span>
				<p class="font-medium mt-1">{workflowProgress}% complete</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/15">
			<span class="text-[10px] text-white/70 mr-1">Needs attention:</span>
			{#if workflowStages.length === 0}
				<button onclick={() => activeTab = 'workflow'} class="text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20">Configure workflow</button>
			{:else if nextStageIndex !== -1}
				<button onclick={() => activeTab = 'workflow'} class="text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20">Complete {workflowStages[nextStageIndex].stageName}</button>
			{/if}
			{#if pendingRequirementCount > 0}
				<button onclick={() => activeTab = 'requirements'} class="text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20">{pendingRequirementCount} requirements pending</button>
			{/if}
			{#if documents.length === 0}
				<button onclick={() => activeTab = 'documents'} class="text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20">Upload construction documents</button>
			{:else if approvedDocumentCount < documents.length}
				<button onclick={() => activeTab = 'approvals'} class="text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20">Review documents</button>
			{:else if nextStageIndex === -1 && !isSubmitted}
				<button onclick={() => activeTab = 'submission'} class="text-[10px] px-2.5 py-1 bg-white/10 hover:bg-white/20">Open submission</button>
			{/if}
		</div>
	</div>

	<!-- Workflow Stepper -->
	<div class="bg-white shadow p-6 mb-6">
		<h2 class="text-xs font-semibold text-gray-700 mb-4">Workflow Progress</h2>
		<div class="relative overflow-x-auto pb-2">
			<div class="relative grid w-full min-w-[720px] grid-cols-[repeat(var(--stage-count),minmax(0,1fr))] items-start" style={`--stage-count: ${Math.max(workflowStages.length, 1)}`}>
			{#each workflowStages as stage, index}
				<div class="relative flex min-w-0 flex-col items-center">
					{#if index < workflowStages.length - 1}
						<div class="pointer-events-none absolute top-4 z-0 h-0.5 {index < completedStageBoundary ? 'bg-[#5fc5c0]' : 'bg-gray-200'}" style="left: calc(50% + 1rem); width: calc(100% - 2rem);"></div>
					{/if}
						<button onclick={() => updateWorkflowStage(stage, index)} disabled={!canUpdateStage(index) || isSubmitted} class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center {getWorkflowStageColor(stage.status)} text-xs font-medium disabled:opacity-45 disabled:cursor-not-allowed" title={canUpdateStage(index) ? 'Mark stage complete' : 'Complete the previous stage first'}>
							{stage.status === 'completed' ? '✓' : index + 1}
						</button>
						<span class="text-[10px] mt-2 text-gray-600 whitespace-nowrap">{stage.stageName}</span>
						{#if stage.completedDate}
							<span class="text-[9px] text-gray-400">{formatDate(stage.completedDate)}</span>
						{/if}
				</div>
			{/each}
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
							<span class="text-xs text-gray-500">Closing Date</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatDate(tender.closingDate)}</p>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<Icon icon="mdi:cash" class="w-5 h-5 text-gray-600" />
							<span class="text-xs text-gray-500">Bid Value</span>
						</div>
						<p class="text-sm font-semibold text-gray-800">{formatValue(Number(tender.value || 0))}</p>
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
							<span class="text-xs text-gray-500">Workflow stages</span>
							<span class="text-xs font-semibold text-[#5fc5c0]">{completedStageCount}/{workflowStages.length}</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-[#5fc5c0] h-2 rounded-full" style={`width: ${workflowProgress}%`}></div>
						</div>
					</div>
					<div class="bg-gray-50 p-4 rounded-lg">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs text-gray-500">Approvals</span>
							<span class="text-xs font-semibold {approvedDocumentCount === documents.length && documents.length > 0 ? 'text-green-600' : 'text-yellow-600'}">{approvedDocumentCount}/{documents.length}</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div class="bg-yellow-500 h-2 rounded-full" style={`width: ${documents.length ? Math.round((approvedDocumentCount / documents.length) * 100) : 0}%`}></div>
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
						<button
							onclick={openTeamMemberModal}
							class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
						>
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
						<button
							onclick={openRequirementModal}
							class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
						>
							<Icon icon="mdi:plus" class="w-4 h-4" />
							<span>Add Custom Requirement</span>
						</button>
					</div>

					<!-- Active Requirements -->
					<div class="space-y-4 mb-6">
						{#each ['Administrative', 'Technical', 'Financial'] as category}
							{#if requirements.filter(r => r.category === category).length > 0}
								<div>
									<h4 class="text-xs font-medium text-gray-700 mb-2">{category}</h4>
									<div class="space-y-2">
										{#each requirements.filter(r => r.category === category) as req}
											<div class="flex items-center justify-between p-3 bg-gray-50 rounded">
												<div class="flex items-center gap-3">
													<button
														onclick={() => toggleRequirementStatus(req.id)}
														class="w-5 h-5 rounded flex items-center justify-center {req.status === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'} hover:opacity-80"
													>
														{req.status === 'complete' ? '✓' : ''}
													</button>
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
							{/if}
						{/each}
					</div>

					<!-- Available Master Requirements -->
					<div class="border-t border-gray-200 pt-4">
						<h4 class="text-xs font-medium text-gray-700 mb-3">Available Standard Requirements</h4>
						<div class="space-y-3">
							{#each ['Administrative', 'Technical', 'Financial'] as category}
								{#if masterRequirements.filter(m => m.category === category && !requirements.find(r => r.name === m.name)).length > 0}
									<div>
										<h5 class="text-[10px] font-medium text-gray-600 mb-2">{category}</h5>
										<div class="space-y-1">
											{#each masterRequirements.filter(m => m.category === category && !requirements.find(r => r.name === m.name)) as masterReq}
												<div class="flex items-center justify-between p-2 bg-blue-50 rounded">
													<div class="flex items-center gap-2">
														<span class="text-[10px] text-gray-700">{masterReq.name}</span>
														{#if masterReq.mandatory}
															<span class="text-[8px] px-1 py-0.5 bg-red-100 text-red-700 rounded">Mandatory</span>
														{/if}
													</div>
													<button
														onclick={() => addMasterRequirement(masterReq)}
														class="text-[10px] text-[#5fc5c0] hover:text-[#4db5b0] font-medium"
													>
														+ Add
													</button>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			{:else if activeTab === 'documents'}
				<!-- Documents Tab -->
				<div>
					<!-- Sub-tabs -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="flex gap-4">
							<button
								onclick={() => documentSubTab = 'templates'}
								class="px-3 py-2 text-xs border-b-2 transition-colors {documentSubTab === 'templates' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}"
							>
								Templates
							</button>
							<button
								onclick={() => documentSubTab = 'documents'}
								class="px-3 py-2 text-xs border-b-2 transition-colors {documentSubTab === 'documents' ? 'border-[#5fc5c0] text-[#5fc5c0]' : 'border-transparent text-gray-600 hover:text-gray-800'}"
							>
								Documents
							</button>
						</nav>
					</div>

					{#if documentSubTab === 'templates'}
						<!-- Templates Sub-tab -->
						<div>
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-xs font-semibold text-gray-700">Bidding Templates</h3>
								<button
									onclick={openTemplateModal}
									class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
								>
									<Icon icon="mdi:plus" class="w-4 h-4" />
									<span>Add Template</span>
								</button>
							</div>
							<div class="space-y-2">
								{#each templates as template}
									<div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded">
										<div class="flex items-center gap-3">
											<Icon icon="mdi:file-document-multiple" class="w-5 h-5 text-blue-600" />
											<div>
												<p class="text-xs font-medium text-gray-800">{template.name}</p>
												<p class="text-[10px] text-gray-500">{template.category} • {template.description}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<span class="text-[10px] text-gray-500">{template.uploadedBy}</span>
											<span class="text-[10px] text-gray-400">{formatDate(template.uploadedDate)}</span>
											<button class="text-[#5fc5c0] hover:text-[#4db5b0]">
												<Icon icon="mdi:download" class="w-4 h-4" />
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else if documentSubTab === 'documents'}
						<!-- Documents Sub-tab -->
						<div>
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-xs font-semibold text-gray-700">Tender Documents</h3>
								<button
									onclick={openUploadModal}
									class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
								>
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
												{#if doc.comments}
													<p class="text-[10px] text-gray-600 italic">"{doc.comments}"</p>
												{/if}
											</div>
										</div>
										<div class="flex items-center gap-2">
											<span class="text-[10px] px-2 py-1 rounded {doc.status === 'Approved' ? 'bg-green-100 text-green-700' : doc.status === 'Pending review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700'}">{doc.status}</span>
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
					{/if}
				</div>
			{:else if activeTab === 'workflow'}
				<!-- Workflow Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Workflow Stages</h3>
						<div class="flex gap-2">
							<button
								onclick={seedWorkflowStages}
								class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors"
							>
								<Icon icon="mdi:refresh" class="w-4 h-4" />
								<span>Reset Default</span>
							</button>
							<button
								onclick={openWorkflowModal}
								class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
							>
								<Icon icon="mdi:plus" class="w-4 h-4" />
								<span>Create Custom</span>
							</button>
						</div>
					</div>
					{#if workflowStages.length === 0}
						<div class="text-center py-12">
							<Icon icon="mdi:progress-clock" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
							<p class="text-sm text-gray-500">No workflow stages configured</p>
							<p class="text-xs text-gray-400">Click "Create/Reset Workflow" to initialize the workflow stages</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each workflowStages as stage, index}
								<div class="p-4 border border-gray-200 rounded">
									<div class="flex items-center justify-between mb-2">
										<div class="flex items-center gap-2">
											<div class="w-6 h-6 rounded-full flex items-center justify-center {getWorkflowStageColor(stage.status)} text-[10px] font-medium">
												{stage.status === 'completed' ? '✓' : stage.status === 'inProgress' ? '●' : '○'}
											</div>
											<span class="text-xs font-medium text-gray-800">{stage.stageName}</span>
										</div>
										<div class="flex items-center gap-2">
											<select
												value={stage.status === 'completed' ? 'Completed' : stage.status === 'inProgress' ? 'In Progress' : 'Pending'}
												onchange={(event) => setWorkflowStageStatus(stage, (event.currentTarget as HTMLSelectElement).value)}
												disabled={!canUpdateStage(index) || isSubmitted}
												title={canUpdateStage(index) ? 'Update workflow status' : 'Complete the previous workflow stage first'}
												class="px-2 py-1 border border-gray-300 text-[10px] text-gray-700 bg-white"
											>
												<option value="Pending">Pending</option>
												<option value="In Progress">In Progress</option>
												<option value="Completed">Completed</option>
											</select>
											<button onclick={() => moveWorkflowStage(index, -1)} disabled={index === 0 || isSubmitted} title="Move stage up" class="p-1 text-gray-500 hover:text-[#114a4b] disabled:opacity-30">
												<Icon icon="mdi:chevron-up" class="w-4 h-4" />
											</button>
											<button onclick={() => moveWorkflowStage(index, 1)} disabled={index === workflowStages.length - 1 || isSubmitted} title="Move stage down" class="p-1 text-gray-500 hover:text-[#114a4b] disabled:opacity-30">
												<Icon icon="mdi:chevron-down" class="w-4 h-4" />
											</button>
											<button onclick={() => removeWorkflowStage(stage)} disabled={isSubmitted} title="Remove stage" class="p-1 text-gray-500 hover:text-red-600 disabled:opacity-30">
												<Icon icon="mdi:delete-outline" class="w-4 h-4" />
											</button>
										</div>
									</div>
									{#if stage.completedAt}
										<p class="text-[10px] text-gray-500">Completed: {formatDate(stage.completedAt)}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'communication'}
				<!-- Communication Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Communication & Clarifications</h3>
						<button
							onclick={openCommunicationModal}
							class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
						>
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
										<button
											onclick={() => openCommunicationDetailsModal(comm)}
											class="text-[10px] text-[#5fc5c0] hover:text-[#4db5b0] font-medium"
										>
											View Details
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'approvals'}
				<!-- Approvals Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Document Approvals</h3>
					</div>

					<!-- Approval Summary -->
					<div class="mb-6 p-4 bg-gray-50 rounded">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-xs font-medium text-gray-800">Approval Status</p>
								<p class="text-[10px] text-gray-500">
									{documents.filter(d => d.status === 'Approved').length} of {documents.length} documents approved
								</p>
							</div>
							{#if documents.filter(d => d.status === 'Approved').length === documents.length && documents.length > 0}
								<span class="px-3 py-1.5 bg-green-500 text-white text-xs rounded">
									Ready for Submission
								</span>
							{:else}
								<span class="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded">
									{documents.filter(d => d.status === 'Pending review').length} Pending
								</span>
							{/if}
						</div>
					</div>

					<!-- Pending Documents -->
					{#if documents.filter(d => d.status === 'Pending review').length > 0}
						<h4 class="text-xs font-medium text-gray-700 mb-3">Pending Review ({documents.filter(d => d.status === 'Pending review').length})</h4>
						<div class="space-y-3 mb-6">
							{#each documents.filter(d => d.status === 'Pending review') as doc}
								<div class="p-4 border border-gray-200 rounded bg-white">
									<div class="flex items-start justify-between mb-3">
										<div class="flex items-center gap-3">
											<Icon icon="mdi:file-documentOutline" class="w-5 h-5 text-gray-600" />
											<div>
												<p class="text-xs font-medium text-gray-800">{doc.name}</p>
												<p class="text-[10px] text-gray-500">{doc.category} • v{doc.version}</p>
											</div>
										</div>
										<span class="text-[10px] px-2 py-1 rounded bg-yellow-100 text-yellow-700">Pending review</span>
									</div>

									{#if doc.comments}
										<p class="text-[10px] text-gray-600 italic mb-3">"{doc.comments}"</p>
									{/if}

									<div class="flex items-center justify-between pt-3 border-t border-gray-100">
										<div class="text-[10px] text-gray-500">
											<span>Uploaded by {doc.uploadedBy}</span>
											<span class="mx-2">•</span>
											<span>{formatDate(doc.uploadedDate)}</span>
										</div>
										<div class="flex gap-2">
												<button
													onclick={async () => { await fetch(`/api/documents/${doc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Approved' }) }); await fetchTender(); }}
												class="px-3 py-1.5 bg-green-500 text-white text-xs hover:bg-green-600 transition-colors"
											>
												Approve
											</button>
											<button
												onclick={() => openRejectModal(doc.id)}
												class="px-3 py-1.5 bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
											>
												Reject
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Approved Documents -->
					{#if documents.filter(d => d.status === 'Approved').length > 0}
						<h4 class="text-xs font-medium text-gray-700 mb-3">Approved Documents ({documents.filter(d => d.status === 'Approved').length})</h4>
						<div class="space-y-3">
							{#each documents.filter(d => d.status === 'Approved') as doc}
								<div class="p-4 border border-green-200 rounded bg-green-50">
									<div class="flex items-start justify-between mb-3">
										<div class="flex items-center gap-3">
											<Icon icon="mdi:check-circle" class="w-5 h-5 text-green-600" />
											<div>
												<p class="text-xs font-medium text-gray-800">{doc.name}</p>
												<p class="text-[10px] text-gray-500">{doc.category} • v{doc.version}</p>
											</div>
										</div>
										<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Approved</span>
									</div>

									{#if doc.comments}
										<p class="text-[10px] text-gray-600 italic mb-3">"{doc.comments}"</p>
									{/if}

									<div class="flex items-center justify-between pt-3 border-t border-green-100">
										<div class="text-[10px] text-gray-500">
											<span>Uploaded by {doc.uploadedBy}</span>
											<span class="mx-2">•</span>
											<span>{formatDate(doc.uploadedDate)}</span>
										</div>
												<button
													onclick={async () => { await fetch(`/api/documents/${doc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Draft' }) }); await fetchTender(); }}
											class="px-3 py-1.5 bg-gray-500 text-white text-xs hover:bg-gray-600 transition-colors"
										>
											Revoke
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					{#if documents.filter(d => d.status === 'Pending review').length === 0 && documents.filter(d => d.status === 'Approved').length === 0}
						<div class="text-center py-12">
							<Icon icon="mdi:check-circle" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
							<p class="text-sm text-gray-500">No documents to approve</p>
							<p class="text-xs text-gray-400">Upload documents and set status to "Pending review"</p>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'submission'}
				<!-- Submission Tab -->
				<div>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-xs font-semibold text-gray-700">Submission</h3>
					</div>

					{#if isSubmitted}
						<!-- Submitted State -->
						<div class="text-center py-12">
							<div class="w-20 h-20 rounded-full bg-[#5fc5c0] flex items-center justify-center mx-auto mb-4">
								<span class="text-4xl font-bold text-white">✓</span>
							</div>
							<p class="text-sm font-semibold text-gray-800 mb-2">Bid Submitted Successfully</p>
							<p class="text-xs text-gray-600">Submitted on {formatDate(submissionDate || '')}</p>
						</div>

						<div class="mt-6">
							<h4 class="text-xs font-semibold text-gray-700 mb-3">Submitted Documents</h4>
							<div class="space-y-2">
								{#each documents.filter(d => d.status === 'Approved') as doc}
									<div class="p-3 border border-gray-200 rounded bg-white flex items-center justify-between">
										<div class="flex items-center gap-3">
											<Icon icon="mdi:file-document" class="w-4 h-4 text-gray-600" />
											<div>
												<p class="text-xs font-medium text-gray-800">{doc.name}</p>
												<p class="text-[10px] text-gray-500">{doc.category} • v{doc.version}</p>
											</div>
										</div>
										<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Approved</span>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<!-- Not Submitted State -->
						{#if documents.filter(d => d.status === 'Approved').length === 0}
							<div class="text-center py-12">
								<Icon icon="mdi:file-alert" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<p class="text-sm text-gray-500">No approved documents</p>
								<p class="text-xs text-gray-400">Approve documents in the Approvals tab before submission</p>
							</div>
						{:else}
							<div class="mb-6">
								<h4 class="text-xs font-semibold text-gray-700 mb-3">Documents Ready for Submission</h4>
								<div class="space-y-2">
									{#each documents.filter(d => d.status === 'Approved') as doc}
										<div class="p-3 border border-gray-200 rounded bg-white flex items-center justify-between">
											<div class="flex items-center gap-3">
												<Icon icon="mdi:file-document" class="w-4 h-4 text-gray-600" />
												<div>
													<p class="text-xs font-medium text-gray-800">{doc.name}</p>
													<p class="text-[10px] text-gray-500">{doc.category} • v{doc.version}</p>
												</div>
											</div>
											<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Approved</span>
										</div>
									{/each}
								</div>
							</div>

							<div class="flex justify-end">
								<button
									onclick={handleSubmitBid}
									class="flex items-center gap-2 px-6 py-3 bg-[#5fc5c0] text-white text-sm hover:bg-[#114a4b] transition-colors"
								>
									<Icon icon="mdi:email-send" class="w-4 h-4" />
									<span>Submit Bid</span>
								</button>
							</div>
						{/if}
					{/if}
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
{/if}
</div>

<!-- Add Team Member Modal -->
{#if showTeamMemberModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Add Team Member</h2>
				<button onclick={closeTeamMemberModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="employeeSelect" class="block text-xs font-medium text-gray-700 mb-1">Select Employee *</label>
					<select
						id="employeeSelect"
						bind:value={selectedEmployee}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">Choose an employee...</option>
						{#each availableEmployees.filter(e => !teamMembers.find(m => m.name === `${e.firstname} ${e.lastname}`)) as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} - {employee.department?.name || 'Construction'}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="roleSelect" class="block text-xs font-medium text-gray-700 mb-1">Role *</label>
					<select
						id="roleSelect"
						bind:value={selectedRole}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">Select a role...</option>
						{#each availableRoles as role}
							<option value={role}>{role}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="responsibilityInput" class="block text-xs font-medium text-gray-700 mb-1">Responsibility *</label>
					<input
						id="responsibilityInput"
						type="text"
						bind:value={selectedResponsibility}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="e.g., Technical Proposal Preparation"
					/>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeTeamMemberModal}
						disabled={isAddingTeamMember}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleAddTeamMember}
						disabled={isAddingTeamMember}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isAddingTeamMember ? 'Adding...' : 'Add Member'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Add Custom Requirement Modal -->
{#if showRequirementModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Add Custom Requirement</h2>
				<button onclick={closeRequirementModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<!-- Available Requirements with Multi-Select -->
				<div>
					<span class="block text-xs font-medium text-gray-700 mb-2">Select Requirements *</span>
					<div class="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 space-y-2" role="group" aria-label="Available requirements">
						{#each ['Administrative', 'Technical', 'Financial'] as category}
							{#if masterRequirements.filter(m => m.category === category && !requirements.find(r => r.name === m.name)).length > 0}
								<div>
									<h5 class="text-[10px] font-medium text-gray-600 mb-1">{category}</h5>
									{#each masterRequirements.filter(m => m.category === category && !requirements.find(r => r.name === m.name)) as masterReq}
										<div class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
											<input
												type="checkbox"
												id={masterReq.id}
												checked={selectedRequirements.includes(masterReq.name)}
												onchange={() => toggleRequirementSelection(masterReq.name)}
												class="w-4 h-4 text-[#5fc5c0] border-gray-300 rounded focus:ring-[#5fc5c0]"
											/>
											<label for={masterReq.id} class="text-[10px] text-gray-700 flex-1">{masterReq.name}</label>
											{#if masterReq.mandatory}
												<span class="text-[8px] px-1 py-0.5 bg-red-100 text-red-700 rounded">Mandatory</span>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Add Custom Requirement -->
				{#if !isAddingNewRequirement}
					<button
						onclick={() => isAddingNewRequirement = true}
						class="text-[10px] text-[#5fc5c0] hover:text-[#4db5b0] font-medium"
					>
						+ Add Custom Requirement
					</button>
				{:else}
					<div class="border-t border-gray-200 pt-3">
						<div class="flex gap-2 mb-2">
							<input
								type="text"
								bind:value={newRequirementName}
								class="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
								placeholder="Enter new requirement name..."
							/>
							<button
								onclick={() => isAddingNewRequirement = false}
								class="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 border border-gray-300"
							>
								<Icon icon="mdi:close" class="w-4 h-4" />
							</button>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="customReqCategory" class="block text-[10px] font-medium text-gray-700 mb-1">Category *</label>
								<select
									id="customReqCategory"
									bind:value={newRequirementCategory}
									class="w-full px-2 py-1.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-[10px]"
								>
									<option value="Administrative">Administrative</option>
									<option value="Technical">Technical</option>
									<option value="Financial">Financial</option>
								</select>
							</div>
							<div class="flex items-center gap-2 pt-4">
								<input
									type="checkbox"
									id="customReqMandatory"
									bind:checked={newRequirementMandatory}
									class="w-3 h-3 text-[#5fc5c0] border-gray-300 rounded focus:ring-[#5fc5c0]"
								/>
								<label for="customReqMandatory" class="text-[10px] text-gray-700">Mandatory</label>
							</div>
						</div>
					</div>
				{/if}

				<!-- Assignment Section -->
				<div class="border-t border-gray-200 pt-3">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="reqResponsible" class="block text-xs font-medium text-gray-700 mb-1">Assign to Employee *</label>
							<select
								id="reqResponsible"
								bind:value={newRequirementResponsible}
								class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							>
								<option value="">Select employee...</option>
								{#each teamMembers as member}
									<option value={member.employee?.user?.id || member.employee?.userId}>{member.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="reqCategory" class="block text-xs font-medium text-gray-700 mb-1">Category Override *</label>
							<select
								id="reqCategory"
								bind:value={newRequirementCategory}
								class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							>
								<option value="Administrative">Administrative</option>
								<option value="Technical">Technical</option>
								<option value="Financial">Financial</option>
							</select>
						</div>
					</div>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeRequirementModal}
						disabled={isAddingRequirement}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleAddRequirement}
						disabled={isAddingRequirement}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isAddingRequirement ? 'Adding...' : 'Add Requirement'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Add Template Modal -->
{#if showTemplateModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Add Template</h2>
				<button onclick={closeTemplateModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="templateFile" class="block text-xs font-medium text-gray-700 mb-1">Select File *</label>
					<input
						id="templateFile"
						type="file"
						onchange={handleTemplateFileSelect}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					/>
					{#if templateFile}
						<p class="text-[10px] text-gray-600 mt-1">Selected: {templateFile.name}</p>
					{/if}
				</div>

				<div>
					<label for="templateName" class="block text-xs font-medium text-gray-700 mb-1">Template Name</label>
					<input
						id="templateName"
						type="text"
						bind:value={templateName}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Auto-filled from file name"
					/>
				</div>

				<div>
					<label for="templateCategory" class="block text-xs font-medium text-gray-700 mb-1">Category *</label>
					<select
						id="templateCategory"
						bind:value={templateCategory}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="Administrative">Administrative</option>
						<option value="Technical">Technical</option>
						<option value="Financial">Financial</option>
					</select>
				</div>

				<div>
					<label for="templateDescription" class="block text-xs font-medium text-gray-700 mb-1">Description *</label>
					<textarea
						id="templateDescription"
						bind:value={templateDescription}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						rows="3"
						placeholder="Describe the template purpose..."
					></textarea>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeTemplateModal}
						disabled={isAddingTemplate}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleAddTemplate}
						disabled={isAddingTemplate}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isAddingTemplate ? 'Adding...' : 'Add Template'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Upload Document Modal -->
{#if showUploadModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Upload Document</h2>
				<button onclick={closeUploadModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="uploadFile" class="block text-xs font-medium text-gray-700 mb-1">Select File *</label>
					<input
						id="uploadFile"
						type="file"
						onchange={handleFileSelect}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					/>
					{#if uploadFile}
						<p class="text-[10px] text-gray-600 mt-1">Selected: {uploadFile.name}</p>
					{/if}
				</div>

				<div>
					<label for="uploadDocumentName" class="block text-xs font-medium text-gray-700 mb-1">Document Name</label>
					<input
						id="uploadDocumentName"
						type="text"
						bind:value={uploadDocumentName}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Auto-filled from file name"
					/>
				</div>

				<div>
					<label for="uploadComments" class="block text-xs font-medium text-gray-700 mb-1">Comments / Notes</label>
					<textarea
						id="uploadComments"
						bind:value={uploadComments}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						rows="3"
						placeholder="Add any comments about this document (e.g., changes made, status, etc.)..."
					></textarea>
				</div>

				<div>
					<label for="uploadStatus" class="block text-xs font-medium text-gray-700 mb-1">Status *</label>
					<select
						id="uploadStatus"
						bind:value={uploadStatus}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="Draft">Draft</option>
						<option value="Pending review">Pending review</option>
						<option value="Approved">Approved</option>
					</select>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeUploadModal}
						disabled={isUploadingDocument}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleUploadDocument}
						disabled={isUploadingDocument}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isUploadingDocument ? 'Uploading...' : 'Upload Document'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Document Rejection Modal -->
{#if showRejectModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Reject Document</h2>
				<button onclick={closeRejectModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="rejectComments" class="block text-xs font-medium text-gray-700 mb-1">Rejection Comments *</label>
					<textarea
						id="rejectComments"
						bind:value={rejectComments}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						rows="4"
						placeholder="Please provide reasons for rejection and any required changes..."
					></textarea>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeRejectModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleRejectDocument}
						class="px-4 py-2 bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
					>
						Reject Document
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Communication Modal -->
{#if showCommunicationModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">New Message</h2>
				<button onclick={closeCommunicationModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="communicationSubject" class="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
					<input
						id="communicationSubject"
						type="text"
						bind:value={communicationSubject}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="e.g., Team meeting reminder"
					/>
				</div>

				<div>
					<label for="communicationMessage" class="block text-xs font-medium text-gray-700 mb-1">Message *</label>
					<textarea
						id="communicationMessage"
						bind:value={communicationMessage}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						rows="4"
						placeholder="Type your message here..."
					></textarea>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeCommunicationModal}
						disabled={isSendingCommunication}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleSendCommunication}
						disabled={isSendingCommunication}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isSendingCommunication ? 'Sending...' : 'Send Message'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Communication Details Modal -->
{#if showCommunicationDetailsModal && selectedCommunication}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Communication Details</h2>
				<button onclick={closeCommunicationDetailsModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div class="flex items-center gap-2 mb-4">
					<Icon icon="mdi:account-group" class="w-5 h-5 text-gray-600" />
					<span class="text-xs font-medium text-gray-800">{selectedCommunication.subject}</span>
				</div>

				<div>
					<p class="text-[10px] font-medium text-gray-500 mb-1">Status</p>
					<span class="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">{selectedCommunication.status}</span>
				</div>

				<div>
					<p class="text-[10px] font-medium text-gray-500 mb-1">From</p>
					<p class="text-xs text-gray-700">{selectedCommunication.sender}</p>
				</div>

				<div>
					<p class="text-[10px] font-medium text-gray-500 mb-1">To</p>
					<p class="text-xs text-gray-700">{selectedCommunication.recipient}</p>
				</div>

				<div>
					<p class="text-[10px] font-medium text-gray-500 mb-1">Date</p>
					<p class="text-xs text-gray-700">{formatDate(selectedCommunication.date)}</p>
				</div>

				<div>
					<p class="text-[10px] font-medium text-gray-500 mb-1">Message</p>
					<div class="p-3 bg-gray-50 rounded text-xs text-gray-700">
						{selectedCommunication.message}
					</div>
				</div>

				<div class="flex justify-end mt-6">
					<button
						onclick={closeCommunicationDetailsModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Custom Workflow Modal -->
{#if showWorkflowModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-lg w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Create Custom Workflow</h2>
				<button onclick={closeWorkflowModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="workflowStagesInput" class="block text-xs font-medium text-gray-700 mb-1">Workflow Stages *</label>
					<textarea
						id="workflowStagesInput"
						bind:value={workflowStagesInput}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						rows="6"
						placeholder="Enter workflow stages (one per line):&#10;Opportunity&#10;Qualification&#10;Bid Decision&#10;Preparation&#10;Approval&#10;Submission"
					></textarea>
					<p class="text-[10px] text-gray-500 mt-1">Enter each stage on a new line. The order will be preserved.</p>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeWorkflowModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleCreateCustomWorkflow}
						disabled={isCreatingWorkflow}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isCreatingWorkflow ? 'Creating...' : 'Create Workflow'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
