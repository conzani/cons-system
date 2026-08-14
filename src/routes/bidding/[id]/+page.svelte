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
		{ id: 'approval', name: 'Approval', status: 'pending', completedDate: null },
		{ id: 'submission', name: 'Submission', status: 'pending', completedDate: null }
	]);

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
	let communications = $state([
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
	let availableEmployees = $state([
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
		{ id: '8', category: 'Technical', name: 'Similar Projects Experience', status: 'complete', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '9', category: 'Technical', name: 'Key Personnel CVs', status: 'complete', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '10', category: 'Technical', name: 'Equipment List', status: 'inProgress', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '11', category: 'Technical', name: 'Method Statement', status: 'pending', mandatory: true, responsible: 'Mary Chirwa' },
		{ id: '16', category: 'Financial', name: 'Audited Accounts (3 years)', status: 'complete', mandatory: true, responsible: 'James Zulu' },
		{ id: '17', category: 'Financial', name: 'Bid Security', status: 'inProgress', mandatory: true, responsible: 'James Zulu' },
		{ id: '18', category: 'Financial', name: 'Bank Statement', status: 'complete', mandatory: true, responsible: 'James Zulu' }
	]);

	let documents = $state([
		{ id: '1', name: 'Tender Notice.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-01', comments: '', status: 'Approved' },
		{ id: '2', name: 'Company Registration.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-02', comments: 'Updated with latest registration', status: 'Approved' },
		{ id: '3', name: 'Tax Clearance.pdf', category: 'Administrative', version: '1', uploadedBy: 'John Banda', uploadedDate: '2026-08-02', comments: '', status: 'Approved' },
		{ id: '4', name: 'Method Statement v2.docx', category: 'Technical', version: '2', uploadedBy: 'Mary Chirwa', uploadedDate: '2026-08-10', comments: 'Revised based on client feedback', status: 'Pending review' },
		{ id: '5', name: 'BOQ.xlsx', category: 'Financial', version: '3', uploadedBy: 'Peter Phiri', uploadedDate: '2026-08-12', comments: 'Final version for submission', status: 'Draft' }
	]);

	let documentSubTab = $state('documents');
	let templates = $state([
		{ id: '1', name: 'Company Profile Template.docx', category: 'Administrative', description: 'Standard company profile for bidding', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '2', name: 'Technical Proposal Template.pptx', category: 'Technical', description: 'Technical proposal presentation template', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '3', name: 'Financial Proposal Template.xlsx', category: 'Financial', description: 'Financial proposal spreadsheet template', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '4', name: 'Method Statement Template.docx', category: 'Technical', description: 'Method statement document template', uploadedBy: 'System', uploadedDate: '2026-01-15' },
		{ id: '5', name: 'CV Template.docx', category: 'Administrative', description: 'Key personnel CV template', uploadedBy: 'System', uploadedDate: '2026-01-15' }
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
			alert('Please select an employee, role, and enter a responsibility');
			return;
		}

		try {
			isAddingTeamMember = true;
			const employee = availableEmployees.find(e => e.id === selectedEmployee);
			const newMember = {
				id: String(teamMembers.length + 1),
				name: employee?.name || 'Unknown',
				role: selectedRole,
				responsibility: selectedResponsibility,
				status: 'Active'
			};

			teamMembers = [...teamMembers, newMember];
			closeTeamMemberModal();
		} catch (error) {
			console.error('Error adding team member:', error);
			alert('Failed to add team member');
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
			alert('Please select a responsible person');
			return;
		}

		if (selectedRequirements.length === 0 && !newRequirementName) {
			alert('Please select at least one requirement or add a new one');
			return;
		}

		try {
			isAddingRequirement = true;

			// Add selected requirements
			for (const reqName of selectedRequirements) {
				const masterReq = masterRequirements.find(m => m.name === reqName);
				if (masterReq && !requirements.find(r => r.name === reqName)) {
					const newReq = {
						id: String(requirements.length + 100),
						category: masterReq.category,
						name: masterReq.name,
						status: 'pending',
						mandatory: masterReq.mandatory,
						responsible: newRequirementResponsible
					};
					requirements = [...requirements, newReq];
				}
			}

			// Add custom requirement if provided
			if (newRequirementName && isAddingNewRequirement) {
				const newReq = {
					id: String(requirements.length + 100),
					category: newRequirementCategory,
					name: newRequirementName,
					status: 'pending',
					mandatory: newRequirementMandatory,
					responsible: newRequirementResponsible
				};
				requirements = [...requirements, newReq];
			}

			closeRequirementModal();
		} catch (error) {
			console.error('Error adding requirement:', error);
			alert('Failed to add requirement');
		} finally {
			isAddingRequirement = false;
		}
	}

	function toggleRequirementStatus(reqId: string) {
		requirements = requirements.map(req => {
			if (req.id === reqId) {
				if (req.status === 'complete') {
					return { ...req, status: 'pending' };
				} else {
					return { ...req, status: 'complete' };
				}
			}
			return req;
		});
	}

	function addMasterRequirement(masterReq: any) {
		const existing = requirements.find(r => r.name === masterReq.name);
		if (!existing) {
			const newReq = {
				id: String(requirements.length + 100),
				category: masterReq.category,
				name: masterReq.name,
				status: 'pending',
				mandatory: masterReq.mandatory,
				responsible: 'John Banda'
			};
			requirements = [...requirements, newReq];
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
			alert('Please select a file or enter template name');
			return;
		}

		if (!templateDescription) {
			alert('Please enter template description');
			return;
		}

		try {
			isAddingTemplate = true;
			const templateFileName = templateFile ? templateFile.name : templateName;
			const newTemplate = {
				id: String(templates.length + 1),
				name: templateFileName,
				category: templateCategory,
				description: templateDescription,
				uploadedBy: 'John Banda',
				uploadedDate: new Date().toISOString().split('T')[0]
			};

			templates = [...templates, newTemplate];
			closeTemplateModal();
		} catch (error) {
			console.error('Error adding template:', error);
			alert('Failed to add template');
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
			alert('Please select a file or enter document name');
			return;
		}

		try {
			isUploadingDocument = true;
			const docName = uploadFile ? uploadFile.name : uploadDocumentName;
			const newDoc = {
				id: String(documents.length + 1),
				name: docName,
				category: 'Administrative',
				version: '1',
				uploadedBy: 'John Banda',
				uploadedDate: new Date().toISOString().split('T')[0],
				comments: uploadComments,
				status: uploadStatus
			};

			documents = [...documents, newDoc];
			closeUploadModal();
		} catch (error) {
			console.error('Error uploading document:', error);
			alert('Failed to upload document');
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

	function handleRejectDocument() {
		if (!rejectDocumentId) return;

		const index = documents.findIndex(d => d.id === rejectDocumentId);
		if (index !== -1) {
			documents[index].status = 'Draft';
			if (rejectComments) {
				documents[index].comments = rejectComments;
			}
		}
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
			alert('Please enter subject and message');
			return;
		}

		try {
			isSendingCommunication = true;
			const newComm = {
				id: String(communications.length + 1),
				type: 'Internal',
				subject: communicationSubject,
				message: communicationMessage,
				sender: 'John Banda',
				recipient: 'Team',
				date: new Date().toISOString().split('T')[0],
				status: 'Sent'
			};

			communications = [newComm, ...communications];
			closeCommunicationModal();
		} catch (error) {
			console.error('Error sending communication:', error);
			alert('Failed to send communication');
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
	function handleSubmitBid() {
		const approvedDocs = documents.filter(d => d.status === 'Approved');
		if (approvedDocs.length === 0) {
			alert('No approved documents to submit. Please approve documents in the Approvals tab.');
			return;
		}
		isSubmitted = true;
		submissionDate = new Date().toISOString().split('T')[0];
		tender.status = 'Submitted';
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
												onclick={() => {
													const index = documents.findIndex(d => d.id === doc.id);
													if (index !== -1) {
														documents[index].status = 'Approved';
													}
												}}
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
											onclick={() => {
												const index = documents.findIndex(d => d.id === doc.id);
												if (index !== -1) {
													documents[index].status = 'Draft';
												}
											}}
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
						{#each availableEmployees.filter(e => !teamMembers.find(m => m.name === e.name)) as employee}
							<option value={employee.id}>{employee.name} - {employee.department}</option>
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
									<option value={member.name}>{member.name}</option>
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
