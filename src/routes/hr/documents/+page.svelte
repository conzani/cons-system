<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let employees = $state<any[]>([]);
	let documents = $state<any[]>([]);
	let templates = $state<any[]>([]);
	let documentTypes = $state<any[]>([]);
	let selectedEmployeeId = $state('');
	let loading = $state(true);
	let documentSearchQuery = $state('');
	let showTemplateModal = $state(false);
	let selectedDocumentType = $state('');
	let uploadingTemplate = $state(false);

	async function loadEmployees() {
		try {
			const response = await fetch('/api/employees');
			if (response.ok) {
				employees = await response.json();
			}
		} catch (error) {
			console.error('Error loading employees:', error);
		}
	}

	async function loadDocuments() {
		try {
			loading = true;
			let url = '/api/documents';
			if (selectedEmployeeId) {
				url += `?employeeId=${selectedEmployeeId}`;
			}
			const response = await fetch(url);
			if (response.ok) {
				documents = await response.json();
			}
		} catch (error) {
			console.error('Error loading documents:', error);
		} finally {
			loading = false;
		}
	}

	async function loadTemplates() {
		try {
			const response = await fetch('/api/documents?isTemplate=true');
			if (response.ok) {
				templates = await response.json();
			}
		} catch (error) {
			console.error('Error loading templates:', error);
		}
	}

	async function loadDocumentTypes() {
		try {
			const response = await fetch('/api/documents/types');
			if (response.ok) {
				documentTypes = await response.json();
			}
		} catch (error) {
			console.error('Error loading document types:', error);
		}
	}

	// Load employees and documents on mount
	onMount(async () => {
		await loadEmployees();
		await loadDocuments();
		await loadTemplates();
		await loadDocumentTypes();
	});

	// Load documents when employee is selected
	$effect(() => {
		loadDocuments();
	});

	function getDocumentTypeIcon(type: string) {
		const name = type?.toLowerCase() || '';
		if (name.includes('contract') || name.includes('employment')) return 'mdi:file-sign';
		if (name.includes('cv') || name.includes('resume')) return 'mdi:file-document';
		if (name.includes('certificate')) return 'mdi:certificate';
		if (name.includes('id') || name.includes('passport')) return 'mdi:card-account-details-horizontal';
		if (name.includes('medical')) return 'mdi:medical-bag';
		if (name.includes('training')) return 'mdi:school';
		if (name.includes('safety')) return 'mdi:shield-account';
		if (name.includes('ppe')) return 'mdi:hard-hat';
		if (name.includes('offer')) return 'mdi:email-open';
		if (name.includes('reference')) return 'mdi:account-check';
		if (name.includes('background')) return 'mdi:account-search';
		if (name.includes('bank')) return 'mdi:bank';
		if (name.includes('tax')) return 'mdi:receipt';
		if (name.includes('termination')) return 'mdi:file-remove';
		if (name.includes('resignation')) return 'mdi:file-alert';
		return 'mdi:file';
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return 'N/A';
		return date.toLocaleDateString();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Approved':
				return 'bg-green-100 text-green-700';
			case 'Draft':
				return 'bg-gray-100 text-gray-700';
			case 'Pending Review':
				return 'bg-yellow-100 text-yellow-700';
			case 'Rejected':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-blue-100 text-blue-700';
		}
	}

	async function uploadTemplate(event: Event) {
		event.preventDefault();
		const fileInput = event.target as HTMLFormElement;
		const file = fileInput.querySelector('input[type="file"]') as HTMLInputElement;
		const titleInput = fileInput.querySelector('input[name="title"]') as HTMLInputElement;
		
		if (!file.files || !file.files[0] || !titleInput.value || !selectedDocumentType) {
			alert('Please select a file, enter a title, and select a document type');
			return;
		}

		try {
			uploadingTemplate = true;
			const formData = new FormData();
			formData.append('file', file.files[0]);
			formData.append('title', titleInput.value);
			formData.append('documentTypeId', selectedDocumentType);
			formData.append('ownerId', '1'); // TODO: Get from auth
			formData.append('isTemplate', 'true');

			const response = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				await loadTemplates();
				showTemplateModal = false;
				fileInput.reset();
				selectedDocumentType = '';
			} else {
				alert('Failed to upload template');
			}
		} catch (error) {
			console.error('Error uploading template:', error);
			alert('Failed to upload template');
		} finally {
			uploadingTemplate = false;
		}
	}

	function getTemplatesForDocumentType(documentTypeId: string) {
		return templates.filter(t => t.documentTypeId === documentTypeId);
	}
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-800">Employee Documents</h1>
		<button
			onclick={() => showTemplateModal = true}
			class="bg-[#5fc5c0] text-white px-4 py-2 text-sm font-medium hover:bg-[#4db5b0] transition-colors flex items-center gap-2"
		>
			<Icon icon="mdi:upload" class="w-4 h-4" />
			Upload Template
		</button>
	</div>

	<div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label for="employeeSelect" class="block text-xs font-medium text-gray-700 mb-2">Select Employee</label>
				<select
					id="employeeSelect"
					bind:value={selectedEmployeeId}
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
				>
					<option value="">All Employees</option>
					{#each employees as employee}
						<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="documentSearch" class="block text-xs font-medium text-gray-700 mb-2">Search Documents</label>
				<input
					id="documentSearch"
					type="text"
					placeholder="Search by title, type, or employee..."
					bind:value={documentSearchQuery}
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
				/>
			</div>
		</div>
	</div>

	{#if loading}
		<p class="text-gray-500">Loading documents...</p>
	{:else if documents.length === 0}
		<p class="text-gray-500">No documents found.</p>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Document</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">File Name</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Created Date</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each documents.filter((doc: any) => 
						doc.title.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
						(doc.documentType?.name || '').toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
						(doc.fileName || '').toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
						(`${doc.owner?.firstname} ${doc.owner?.lastname}` || '').toLowerCase().includes(documentSearchQuery.toLowerCase())
					) as document}
						<tr class="border-t border-gray-200 hover:bg-gray-50">
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<Icon icon={getDocumentTypeIcon(document.documentType?.name)} class="w-4 h-4 text-gray-600" />
									<span class="text-xs font-medium text-gray-800">{document.title}</span>
								</div>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{document.documentType?.name || '-'}
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">{document.fileName}</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{document.owner?.firstname} {document.owner?.lastname}
							</td>
							<td class="px-4 py-3">
								<span class="text-xs px-2 py-1 rounded {getStatusColor(document.status)}">
									{document.status}
								</span>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{formatDate(document.createdAt)}
							</td>
							<td class="px-4 py-3">
								<div class="flex gap-2">
									<a
										href={`/api/documents/${document.publicId}?download=true`}
										download
										class="text-[#5fc5c0] hover:text-[#4db5b0] text-xs"
									>
										<Icon icon="mdi:download" class="w-4 h-4" />
									</a>
									<a
										href={`/documents/${document.publicId}`}
										class="text-gray-600 hover:text-gray-800 text-xs"
									>
										<Icon icon="mdi:eye" class="w-4 h-4" />
									</a>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Template Upload Modal -->
{#if showTemplateModal}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
		role="button"
		tabindex="0"
		aria-label="Close modal"
		onclick={() => showTemplateModal = false}
		onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') showTemplateModal = false; }}
	>
		<div
			class="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="p-6 border-b border-gray-200 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-gray-800">Upload Document Template</h2>
				<button
					onclick={() => showTemplateModal = false}
					class="text-gray-500 hover:text-gray-700"
				>
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<form onsubmit={uploadTemplate} class="p-6">
				<div class="mb-4">
					<label for="templateDocType" class="block text-xs font-medium text-gray-700 mb-2">Document Type</label>
					<select
						id="templateDocType"
						bind:value={selectedDocumentType}
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						required
					>
						<option value="">Select Document Type</option>
						{#each documentTypes as type}
							<option value={type.id}>{type.name}</option>
						{/each}
					</select>
				</div>
				<div class="mb-4">
					<label for="templateTitle" class="block text-xs font-medium text-gray-700 mb-2">Template Title</label>
					<input
						type="text"
						id="templateTitle"
						name="title"
						placeholder="Enter template title"
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						required
					/>
				</div>
				<div class="mb-4">
					<label for="templateFile" class="block text-xs font-medium text-gray-700 mb-2">Template File</label>
					<input
						type="file"
						id="templateFile"
						accept=".pdf,.doc,.docx,.xls,.xlsx"
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						required
					/>
					<p class="text-xs text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, XLS, XLSX</p>
				</div>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={() => showTemplateModal = false}
						class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={uploadingTemplate}
						class="px-4 py-2 text-sm bg-[#5fc5c0] text-white rounded hover:bg-[#4db5b0] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{uploadingTemplate ? 'Uploading...' : 'Upload Template'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
