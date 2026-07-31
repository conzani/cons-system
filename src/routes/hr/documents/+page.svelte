<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let employees = $state<any[]>([]);
	let documents = $state<any[]>([]);
	let selectedEmployeeId = $state('');
	let loading = $state(true);

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
		if (!selectedEmployeeId) {
			documents = [];
			return;
		}

		try {
			const response = await fetch(`/api/documents?employeeId=${selectedEmployeeId}`);
			if (response.ok) {
				documents = await response.json();
			}
		} catch (error) {
			console.error('Error loading documents:', error);
		} finally {
			loading = false;
		}
	}

	// Load employees on mount
	onMount(() => {
		loadEmployees();
	});

	// Load documents when employee is selected
	$effect(() => {
		if (selectedEmployeeId) {
			loadDocuments();
		}
	});

	function getDocumentTypeIcon(type: string) {
		switch (type) {
			case 'National ID':
				return 'mdi:card-account-details';
			case 'Passport':
				return 'mdi:passport';
			case 'CV/Resume':
				return 'mdi:file-document';
			case 'Employment Contract':
				return 'mdi:file-sign';
			case 'Certificate':
				return 'mdi:certificate';
			case 'Driver License':
				return 'mdi:card-account-details-horizontal';
			case 'Medical Certificate':
				return 'mdi:medical-bag';
			case 'PPE Record':
				return 'mdi:hard-hat';
			case 'Training Certificate':
				return 'mdi:school';
			case 'Safety Certification':
				return 'mdi:shield-account';
			default:
				return 'mdi:file';
		}
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
</script>

<div class="p-6">
	<h1 class="text-2xl font-bold text-gray-800 mb-6">Employee Documents</h1>

	<div class="mb-6">
		<label for="employeeSelect" class="block text-xs font-medium text-gray-700 mb-2">Select Employee</label>
		<select
			id="employeeSelect"
			bind:value={selectedEmployeeId}
			class="w-full max-w-md px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
		>
			<option value="">All Employees</option>
			{#each employees as employee}
				<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
			{/each}
		</select>
	</div>

	{#if !selectedEmployeeId}
		<p class="text-gray-500 text-sm">Select an employee to view their documents.</p>
	{:else if loading}
		<p class="text-gray-500">Loading documents...</p>
	{:else if documents.length === 0}
		<p class="text-gray-500">No documents found for this employee.</p>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Document</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">File Name</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Created Date</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each documents as document}
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
							<td class="px-4 py-3">
								<span class="text-xs px-2 py-1 rounded {getStatusColor(document.status)}">
									{document.status}
								</span>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{new Date(document.createdAt).toLocaleDateString()}
							</td>
							<td class="px-4 py-3">
								<div class="flex gap-2">
									<a
										href={`/api/documents/${document.id}?download=true`}
										download
										class="text-[#5fc5c0] hover:text-[#4db5b0] text-xs"
									>
										<Icon icon="mdi:download" class="w-4 h-4" />
									</a>
									<a
										href={`/documents/${document.id}`}
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
