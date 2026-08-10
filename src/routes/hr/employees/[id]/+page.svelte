<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from '$lib/stores/toast';

	let employee = $state<any>(null);
	let loading = $state(true);
	let updatingStatus = $state(false);
	let uploadingDocuments = $state(false);
	let documentTypes = $state<any[]>([]);
	let employeeDocType = $state('');
	let employeeDocStatus = $state('Approved');
	let documents = $state<{ file: File; documentTypeId: string; status: string }[]>([]);
	let documentSearchQuery = $state('');

	onMount(async () => {
		const id = $page.params.id;
		if (id) {
			await loadEmployee(id);
		}
		await loadDocumentTypes();
	});

	async function loadEmployee(publicId: string) {
		try {
			loading = true;
			const response = await fetch(`/api/employees?publicId=${publicId}`);
			if (response.ok) {
				employee = await response.json();
				console.log('Employee data:', employee);
				console.log('Hire date:', employee.hireDate, 'Type:', typeof employee.hireDate);
				console.log('Date of birth:', employee.dateOfBirth, 'Type:', typeof employee.dateOfBirth);
			}
		} catch (error) {
			console.error('Error loading employee:', error);
		} finally {
			loading = false;
		}
	}

	async function loadDocumentTypes() {
		try {
			const response = await fetch('/api/documents/types');
			if (response.ok) {
				const allTypes = await response.json();
				const employeeDocTypeNames = [
					'Contract', 'Offer Letter', 'CV', 'Resume', 'Certificate',
					'ID Copy', 'Passport', 'Driver License', 'National ID',
					'Degree', 'Transcript', 'Reference Letter', 'Background Check',
					'Medical Certificate', 'Tax Form', 'Bank Details',
					'Emergency Contact', 'Performance Review', 'Termination Letter', 'Resignation Letter'
				];
				documentTypes = allTypes.filter((type: any) =>
					employeeDocTypeNames.some(name =>
						type.name.toLowerCase().includes(name.toLowerCase())
					)
				);
			}
		} catch (error) {
			console.error('Error loading document types:', error);
		}
	}

	function formatDate(dateString: string | null | number | undefined) {
		if (!dateString) return 'N/A';
		
		let date: Date;
		
		// Handle if it's a number (timestamp in milliseconds)
		if (typeof dateString === 'number') {
			date = new Date(dateString);
		} 
		// Handle if it's a string
		else if (typeof dateString === 'string') {
			// Try parsing as ISO string
			date = new Date(dateString);
			
			// If that fails, try parsing as different formats
			if (isNaN(date.getTime())) {
				// Try parsing as YYYY-MM-DD
				const parts = dateString.split('-');
				if (parts.length === 3) {
					const year = parseInt(parts[0]);
					const month = parseInt(parts[1]) - 1;
					const day = parseInt(parts[2]);
					date = new Date(year, month, day);
				}
			}
		} else {
			return 'N/A';
		}
		
		// Check if date is valid
		if (isNaN(date.getTime())) {
			console.error('Invalid date:', dateString, 'Type:', typeof dateString);
			return 'N/A';
		}
		
		return date.toLocaleDateString();
	}

	function formatCurrency(amount: string | null) {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('en-MW', {
			style: 'currency',
			currency: 'MWK'
		}).format(Number(amount));
	}

	function getDocumentTypeIcon(docTypeName: string) {
		const name = docTypeName?.toLowerCase() || '';
		if (name.includes('contract') || name.includes('employment')) return 'mdi:file-sign';
		if (name.includes('cv') || name.includes('resume')) return 'mdi:file-document';
		if (name.includes('certificate')) return 'mdi:certificate';
		if (name.includes('id') || name.includes('passport')) return 'mdi:card-account-details-horizontal';
		if (name.includes('medical')) return 'mdi:medical-bag';
		if (name.includes('training')) return 'mdi:school';
		if (name.includes('safety')) return 'mdi:shield-account';
		if (name.includes('offer')) return 'mdi:email-open';
		if (name.includes('reference')) return 'mdi:account-check';
		if (name.includes('background')) return 'mdi:account-search';
		if (name.includes('bank')) return 'mdi:bank';
		if (name.includes('tax')) return 'mdi:receipt';
		if (name.includes('termination')) return 'mdi:file-remove';
		if (name.includes('resignation')) return 'mdi:file-alert';
		return 'mdi:file';
	}

	function getDocumentStatusColor(status: string) {
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

	function goBack() {
		goto('/hr/employees');
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			const newFiles = Array.from(input.files).map(file => ({
				file,
				documentTypeId: employeeDocType || '',
				status: employeeDocStatus
			}));
			documents = [...documents, ...newFiles];
		}
	}

	function removeDocument(index: number) {
		documents = documents.filter((_, i) => i !== index);
	}

	async function uploadDocuments() {
		if (documents.length === 0) return;

		try {
			uploadingDocuments = true;
			const uploadPromises = documents.map(async (doc) => {
				const formData = new FormData();
				formData.append('file', doc.file);
				formData.append('title', doc.file.name);
				formData.append('description', `Employee document for ${employee.firstname} ${employee.lastname}`);
				formData.append('ownerId', '1');
				formData.append('employeeId', employee.id);
				formData.append('status', doc.status);
				if (doc.documentTypeId) {
					formData.append('documentTypeId', doc.documentTypeId);
				}

				const response = await fetch('/api/documents', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					console.error('Failed to upload document:', doc.file.name);
				}
			});

			await Promise.all(uploadPromises);
			// Reload employee to show new documents
			await loadEmployee(employee.id);
			documents = [];
			toast.success('Documents uploaded successfully');
		} catch (error) {
			console.error('Error uploading documents:', error);
			toast.error('Failed to upload documents');
		} finally {
			uploadingDocuments = false;
		}
	}

	async function updateEmploymentStatus(newStatus: string) {
		try {
			updatingStatus = true;
			const publicId = $page.params.id;
			console.log('Updating employment status:', { publicId, newStatus });
			
			const response = await fetch(`/api/employees?publicId=${publicId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employmentStatus: newStatus
				})
			});

			console.log('Response status:', response.status);
			
			if (!response.ok) {
				const error = await response.json();
				console.error('API error:', error);
				toast.error(error.error || 'Failed to update employment status');
				return;
			}

			employee = await response.json();
			toast.success(`Employment status updated to ${newStatus}`);
		} catch (error) {
			console.error('Error updating employment status:', error);
			toast.error('Error updating employment status');
		} finally {
			updatingStatus = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-100">
	<div class="w-full p-6">
		<div class="mb-6">
			<button
				onclick={goBack}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium mb-4"
			>
				<Icon icon="mdi:arrow-left" class="w-4 h-4" />
				Back to Employees
			</button>
			<div class="flex justify-between items-center">
				<h1 class="text-2xl font-bold text-gray-800">Employee Details</h1>
				<button
					onclick={() => goto(`/hr/employees/${employee?.publicId}/edit`)}
					class="bg-[#5fc5c0] text-white py-2 px-4 text-sm font-medium hover:bg-[#114a4b] focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
				>
					Edit Employee
				</button>
			</div>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Loading employee details...</div>
			</div>
		{:else if employee}
			<div class="bg-white p-6 rounded-lg">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Left Column -->
					<div class="space-y-6">
						<!-- Personal Information -->
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
							<div class="grid grid-cols-2 gap-4">
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">First Name</p>
									<p class="text-sm font-medium text-gray-800">{employee.firstname}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Last Name</p>
									<p class="text-sm font-medium text-gray-800">{employee.lastname}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Email</p>
									<p class="text-sm font-medium text-gray-800">{employee.email || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Phone</p>
									<p class="text-sm font-medium text-gray-800">{employee.phone || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Date of Birth</p>
									<p class="text-sm font-medium text-gray-800">{formatDate(employee.dateOfBirth)}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Gender</p>
									<p class="text-sm font-medium text-gray-800">{employee.gender || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Marital Status</p>
									<p class="text-sm font-medium text-gray-800">{employee.maritalStatus || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Nationality</p>
									<p class="text-sm font-medium text-gray-800">{employee.nationality || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">ID Type</p>
									<p class="text-sm font-medium text-gray-800">{employee.idType || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">ID Number</p>
									<p class="text-sm font-medium text-gray-800">{employee.idNumber || 'N/A'}</p>
								</div>
							</div>
						</div>

						<!-- Employment Details -->
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Employment Details</h3>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<p class="text-xs text-gray-500 mb-1">Department</p>
									<p class="text-sm font-medium text-gray-800">{employee.department?.name || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Employment Type</p>
									<p class="text-sm font-medium text-gray-800">{employee.employmentType || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Branch</p>
									<p class="text-sm font-medium text-gray-800">{employee.branch?.name || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Hire Date</p>
									<p class="text-sm font-medium text-gray-800">{formatDate(employee.hireDate)}</p>
								</div>
								<div class="col-span-2">
									<p class="text-xs text-gray-500 mb-1">Employment Status</p>
									<select
										value={employee.employmentStatus}
										onchange={(e) => {
											const target = e.target as HTMLSelectElement;
											updateEmploymentStatus(target.value);
										}}
										disabled={updatingStatus}
										class="w-full px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] disabled:opacity-60 disabled:cursor-not-allowed"
									>
										<option value="Active">Active</option>
										<option value="Inactive">Inactive</option>
										<option value="On Leave">On Leave</option>
										<option value="Terminated">Terminated</option>
									</select>
								</div>
							</div>
						</div>

						<!-- Address & Emergency Contact -->
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Address & Emergency Contact</h3>
							<div class="space-y-4">
								<div>
									<p class="text-xs text-gray-500 mb-1">Address</p>
									<p class="text-sm text-gray-700 whitespace-pre-wrap">{employee.address || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Emergency Contact</p>
									<p class="text-sm font-medium text-gray-800">{employee.emergencyContact || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Emergency Phone</p>
									<p class="text-sm font-medium text-gray-800">{employee.emergencyPhone || 'N/A'}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Right Column -->
					<div class="space-y-6">
						<!-- Payment Type -->
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Payment Type</h3>
							<div>
								<p class="text-xs text-gray-500 mb-1">Payment Type</p>
								<p class="text-sm font-medium text-gray-800">{employee.paymentType}</p>
							</div>
							{#if employee.paymentType === 'Hourly'}
								<div class="mt-4">
									<p class="text-xs text-gray-500 mb-1">Hourly Rate</p>
									<p class="text-sm font-medium text-gray-800">{formatCurrency(employee.hourlyRate)}</p>
								</div>
							{/if}
							{#if employee.paymentType === 'Daily'}
								<div class="mt-4">
									<p class="text-xs text-gray-500 mb-1">Daily Rate</p>
									<p class="text-sm font-medium text-gray-800">{formatCurrency(employee.dailyRate)}</p>
								</div>
							{/if}
							{#if employee.paymentType === 'Monthly'}
								<div class="mt-4">
									<p class="text-xs text-gray-500 mb-1">Monthly Salary</p>
									<p class="text-sm font-medium text-gray-800">{formatCurrency(employee.monthlySalary)}</p>
								</div>
							{/if}
						</div>

						<!-- Payment Details -->
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Payment Details</h3>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<p class="text-xs text-gray-500 mb-1">Payment Method</p>
									<p class="text-sm font-medium text-gray-800">{employee.paymentMethod || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Payment Method Name</p>
									<p class="text-sm font-medium text-gray-800">{employee.paymentMethodName || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Account Name</p>
									<p class="text-sm font-medium text-gray-800">{employee.accountName || 'N/A'}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500 mb-1">Account Number</p>
									<p class="text-sm font-medium text-gray-800">{employee.accountNumber || 'N/A'}</p>
								</div>
							</div>
						</div>

						<!-- Notes -->
						{#if employee.notes}
							<div class="border-b border-gray-200 pb-4">
								<h3 class="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
								<div>
									<p class="text-xs text-gray-500 mb-1">Additional Notes</p>
									<p class="text-sm text-gray-700 whitespace-pre-wrap">{employee.notes}</p>
								</div>
							</div>
						{/if}

						<!-- Documents -->
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Employee Documents</h3>
							
							<!-- Upload Section -->
							<div class="bg-gray-50 p-4 rounded-lg mb-4">
								<div class="space-y-4">
									<div>
										<label for="employeeDocType" class="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
										<select
											id="employeeDocType"
											bind:value={employeeDocType}
											class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										>
											<option value="">Select Document Type</option>
											{#each documentTypes as type}
												<option value={type.id}>{type.name}</option>
											{/each}
										</select>
									</div>
									<div>
										<label for="employeeDocStatus" class="block text-xs font-medium text-gray-700 mb-1">Document Status</label>
										<select
											id="employeeDocStatus"
											bind:value={employeeDocStatus}
											class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										>
											<option value="Approved">Approved</option>
											<option value="Draft">Draft</option>
											<option value="Pending Review">Pending Review</option>
											<option value="Rejected">Rejected</option>
										</select>
									</div>
									<div>
										<label for="documents" class="block text-xs font-medium text-gray-700 mb-1">Upload Documents</label>
										<input
											type="file"
											id="documents"
											multiple
											onchange={handleFileSelect}
											class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										/>
										<p class="text-xs text-gray-500 mt-1">Upload CV, certificates, ID copies, etc.</p>
									</div>
									{#if documents.length > 0}
										<div class="space-y-3">
											<h4 class="text-xs font-medium text-gray-700">Selected Files:</h4>
											{#each documents as doc, index}
												<div class="bg-white p-3 rounded border border-gray-200">
													<div class="flex items-center justify-between mb-2">
														<div class="flex items-center gap-2">
															<Icon icon="mdi:file-document" class="w-4 h-4 text-gray-500" />
															<span class="text-xs text-gray-700">{doc.file.name}</span>
															<span class="text-xs text-gray-500">({(doc.file.size / 1024).toFixed(1)} KB)</span>
														</div>
														<button
															type="button"
															onclick={() => removeDocument(index)}
															class="text-red-500 hover:text-red-700"
														>
															<Icon icon="mdi:close" class="w-4 h-4" />
														</button>
													</div>
													<div>
														<label for="doc-type-{index}" class="block text-xs text-gray-600 mb-1">Document Type <span class="text-red-500">*</span></label>
														<select
															id="doc-type-{index}"
															bind:value={doc.documentTypeId}
															class="w-full px-2 py-1 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
															required
														>
															<option value="">Select Type *</option>
															{#each documentTypes as type}
																<option value={type.id}>{type.name}</option>
															{/each}
														</select>
													</div>
												</div>
											{/each}
										</div>
										<button
											onclick={uploadDocuments}
											disabled={uploadingDocuments}
											class="mt-3 bg-[#5fc5c0] text-white py-2 px-4 text-xs font-medium hover:bg-[#114a4b] focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] disabled:opacity-60 disabled:cursor-not-allowed"
										>
											{uploadingDocuments ? 'Uploading...' : 'Upload Documents'}
										</button>
									{/if}
								</div>
							</div>

							<!-- Existing Documents -->
							{#if employee.documents && employee.documents.length > 0}
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<h4 class="text-xs font-medium text-gray-700">Existing Documents:</h4>
										<input
											type="text"
											placeholder="Search documents..."
											bind:value={documentSearchQuery}
											class="px-3 py-1 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] w-48"
										/>
									</div>
									{#each employee.documents.filter((doc: any) => 
										doc.title.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
										(doc.documentType?.name || '').toLowerCase().includes(documentSearchQuery.toLowerCase())
									) as doc}
										<div class="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
											<div class="flex items-center gap-3">
												<Icon 
													icon={getDocumentTypeIcon(doc.documentType?.name || '')} 
													class="w-5 h-5 text-gray-600" 
												/>
												<div>
													<p class="text-sm font-medium text-gray-800">{doc.title}</p>
													<p class="text-xs text-gray-500">
														{doc.documentType?.name || 'Unknown Type'}
													</p>
													<p class="text-xs text-gray-400">
														Created: {formatDate(doc.createdAt)} • Updated: {formatDate(doc.updatedAt)}
													</p>
												</div>
											</div>
											<div class="flex items-center gap-2">
												<span class="text-[10px] px-2 py-1 {getDocumentStatusColor(doc.status)}">{doc.status}</span>
												<button
													onclick={() => window.open(`/api/documents/${doc.publicId}?view=true`, '_blank')}
													class="text-gray-500 hover:text-gray-700"
													title="View"
												>
													<Icon icon="mdi:eye" class="w-4 h-4" />
												</button>
												<button
													onclick={() => window.open(`/api/documents/${doc.publicId}?download=true`, '_blank')}
													class="text-gray-500 hover:text-gray-700"
													title="Download"
												>
													<Icon icon="mdi:download" class="w-4 h-4" />
												</button>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-gray-500">No documents uploaded for this employee.</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Employee not found</div>
			</div>
		{/if}
	</div>
</div>
