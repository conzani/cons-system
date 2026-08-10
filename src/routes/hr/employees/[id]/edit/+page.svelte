<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from '$lib/stores/toast';

	let submitting = $state(false);

	// Form state
	let employeeNumber = $state('');
	let firstname = $state('');
	let lastname = $state('');
	let email = $state('');
	let phone = $state('');
	let dateOfBirth = $state('');
	let gender = $state('');
	let maritalStatus = $state('');
	let nationality = $state('');
	let idType = $state('');
	let idNumber = $state('');
	let employmentType = $state('');
	let paymentType = $state('Monthly');
	let hourlyRate = $state('');
	let dailyRate = $state('');
	let monthlySalary = $state('');
	let hireDate = $state('');
	let address = $state('');
	let emergencyContact = $state('');
	let emergencyPhone = $state('');
	let profilePicture = $state('');
	let notes = $state('');
	let departmentId = $state('');
	let branchId = $state('');
	let departments = $state<any[]>([]);
	let branches = $state<any[]>([]);
	let paymentMethod = $state('');
	let paymentMethodName = $state('');
	let accountName = $state('');
	let accountNumber = $state('');

	// Document upload state
	let documents = $state<{ file: File; documentTypeId: string; status: string }[]>([]);
	let documentTypes = $state<any[]>([]);
	let uploadingDocuments = $state(false);
	let employeeDocType = $state('');
	let employeeDocStatus = $state('Approved');

	onMount(async () => {
		const publicId = $page.params.id;
		if (publicId) {
			await loadEmployee(publicId);
		}
		await loadDocumentTypes();
		await loadDepartments();
		await loadBranches();
	});

	async function loadDepartments() {
		try {
			const response = await fetch('/api/admin/departments');
			if (response.ok) {
				departments = await response.json();
			}
		} catch (error) {
			console.error('Error loading departments:', error);
		}
	}

	async function loadBranches() {
		try {
			const response = await fetch('/api/admin/branches');
			if (response.ok) {
				branches = await response.json();
			}
		} catch (error) {
			console.error('Error loading branches:', error);
		}
	}

	async function loadEmployee(publicId: string) {
		try {
			const response = await fetch(`/api/employees?publicId=${publicId}`);
			if (response.ok) {
				const employee = await response.json();
				employeeNumber = employee.employeeNumber || '';
				firstname = employee.firstname || '';
				lastname = employee.lastname || '';
				email = employee.email || '';
				phone = employee.phone || '';
				dateOfBirth = employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '';
				gender = employee.gender || '';
				maritalStatus = employee.maritalStatus || '';
				nationality = employee.nationality || '';
				idType = employee.idType || '';
				idNumber = employee.idNumber || '';
				employmentType = employee.employmentType || '';
				paymentType = employee.paymentType || 'Monthly';
				hourlyRate = employee.hourlyRate || '';
				dailyRate = employee.dailyRate || '';
				monthlySalary = employee.monthlySalary || '';
				hireDate = employee.hireDate ? employee.hireDate.split('T')[0] : '';
				address = employee.address || '';
				emergencyContact = employee.emergencyContact || '';
				emergencyPhone = employee.emergencyPhone || '';
				profilePicture = employee.profilePicture || '';
				notes = employee.notes || '';
				departmentId = employee.departmentId || '';
				branchId = employee.branchId || '';
				paymentMethod = employee.paymentMethod || '';
				paymentMethodName = employee.paymentMethodName || '';
				accountName = employee.accountName || '';
				accountNumber = employee.accountNumber || '';
			}
		} catch (error) {
			console.error('Error loading employee:', error);
			toast.error('Failed to load employee data');
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

	async function uploadDocuments(employeeId: string) {
		if (documents.length === 0) return;

		try {
			uploadingDocuments = true;
			const uploadPromises = documents.map(async (doc) => {
				const formData = new FormData();
				formData.append('file', doc.file);
				formData.append('title', doc.file.name);
				formData.append('description', `Employee document for ${firstname} ${lastname}`);
				formData.append('ownerId', '1');
				formData.append('employeeId', employeeId);
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
		} catch (error) {
			console.error('Error uploading documents:', error);
		} finally {
			uploadingDocuments = false;
		}
	}

	async function updateEmployee() {
		const documentsWithoutType = documents.filter(doc => !doc.documentTypeId);
		if (documentsWithoutType.length > 0) {
			toast.error('Please select a document type for all uploaded files');
			return;
		}

		try {
			submitting = true;
			const publicId = $page.params.id;
			const response = await fetch(`/api/employees?publicId=${publicId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employeeNumber,
					firstname,
					lastname,
					email,
					phone,
					dateOfBirth,
					gender,
					maritalStatus,
					nationality,
					idType,
					idNumber,
					employmentType,
					paymentType,
					hourlyRate: paymentType === 'Hourly' ? hourlyRate : null,
					dailyRate: paymentType === 'Daily' ? dailyRate : null,
					monthlySalary: paymentType === 'Monthly' ? monthlySalary : null,
					hireDate,
					address,
					emergencyContact,
					emergencyPhone,
					profilePicture,
					notes,
					departmentId: departmentId || null,
					branchId: branchId || null,
					paymentMethod,
					paymentMethodName,
					accountName,
					accountNumber
				})
			});

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.error || 'Failed to update employee');
				return;
			}

			const employee = await response.json();
			await uploadDocuments(employee.id);
			toast.success('Employee updated successfully');
			goto(`/hr/employees/${employee.publicId}`);
		} catch (error) {
			console.error('Error updating employee:', error);
			toast.error('Error updating employee. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function cancel() {
		goto(`/hr/employees/${$page.params.id}`);
	}
</script>

<div class="min-h-screen bg-gray-100">
	<div class="w-full p-6">
		<div class="mb-6">
			<button
				onclick={cancel}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium mb-4"
			>
				<Icon icon="mdi:arrow-left" class="w-4 h-4" />
				Back to Employee Details
			</button>
			<h1 class="text-2xl font-bold text-gray-800">Edit Employee</h1>
		</div>

		<div class="bg-white p-6 rounded-lg">
			<form onsubmit={updateEmployee}>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Left Column -->
					<div class="space-y-6">
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="firstname" class="block text-xs font-medium text-gray-700 mb-1">First Name</label>
									<input
										id="firstname"
										type="text"
										bind:value={firstname}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										required
									/>
								</div>
								<div>
									<label for="lastname" class="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
									<input
										id="lastname"
										type="text"
										bind:value={lastname}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										required
									/>
								</div>
								<div>
									<label for="email" class="block text-xs font-medium text-gray-700 mb-1">Email</label>
									<input
										id="email"
										type="email"
										bind:value={email}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
								<div>
									<label for="phone" class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
									<input
										id="phone"
										type="text"
										bind:value={phone}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
								<div>
									<label for="dateOfBirth" class="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
									<input
										id="dateOfBirth"
										type="date"
										bind:value={dateOfBirth}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
								<div>
									<label for="gender" class="block text-xs font-medium text-gray-700 mb-1">Gender</label>
									<select
										id="gender"
										bind:value={gender}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select Gender</option>
										<option value="Male">Male</option>
										<option value="Female">Female</option>
									</select>
								</div>
								<div>
									<label for="maritalStatus" class="block text-xs font-medium text-gray-700 mb-1">Marital Status</label>
									<select
										id="maritalStatus"
										bind:value={maritalStatus}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select Status</option>
										<option value="Single">Single</option>
										<option value="Married">Married</option>
										<option value="Divorced">Divorced</option>
										<option value="Widowed">Widowed</option>
									</select>
								</div>
								<div>
									<label for="nationality" class="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
									<input
										id="nationality"
										type="text"
										bind:value={nationality}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
								<div>
									<label for="idType" class="block text-xs font-medium text-gray-700 mb-1">ID Type</label>
									<select
										id="idType"
										bind:value={idType}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select ID Type</option>
										<option value="National ID">National ID</option>
										<option value="License">License</option>
										<option value="Passport">Passport</option>
									</select>
								</div>
								<div>
									<label for="idNumber" class="block text-xs font-medium text-gray-700 mb-1">ID Number</label>
									<input
										id="idNumber"
										type="text"
										bind:value={idNumber}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
							</div>
						</div>

						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Employment Details</h3>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="employmentType" class="block text-xs font-medium text-gray-700 mb-1">Employment Type</label>
									<select
										id="employmentType"
										bind:value={employmentType}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select Type</option>
										<option value="Full-time">Full-time</option>
										<option value="Part-time">Part-time</option>
										<option value="Contract">Contract</option>
										<option value="Intern">Intern</option>
									</select>
								</div>
								<div>
									<label for="departmentId" class="block text-xs font-medium text-gray-700 mb-1">Department</label>
									<select
										id="departmentId"
										bind:value={departmentId}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select Department</option>
										{#each departments as dept}
											<option value={dept.id}>{dept.name}</option>
										{/each}
									</select>
								</div>
								<div>
									<label for="branchId" class="block text-xs font-medium text-gray-700 mb-1">Branch</label>
									<select
										id="branchId"
										bind:value={branchId}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select Branch</option>
										{#each branches as branch}
											<option value={branch.id}>{branch.name}</option>
										{/each}
									</select>
								</div>
								<div class="col-span-2">
									<label for="hireDate" class="block text-xs font-medium text-gray-700 mb-1">Hire Date <span class="text-red-500">*</span></label>
									<input
										id="hireDate"
										type="date"
										bind:value={hireDate}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										required
									/>
								</div>
							</div>
						</div>

						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Address & Emergency Contact</h3>
							<div class="space-y-4">
								<div>
									<label for="address" class="block text-xs font-medium text-gray-700 mb-1">Address</label>
									<textarea
										id="address"
										bind:value={address}
										rows="2"
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									></textarea>
								</div>
								<div>
									<label for="emergencyContact" class="block text-xs font-medium text-gray-700 mb-1">Emergency Contact</label>
									<input
										id="emergencyContact"
										type="text"
										bind:value={emergencyContact}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
								<div>
									<label for="emergencyPhone" class="block text-xs font-medium text-gray-700 mb-1">Emergency Phone</label>
									<input
										id="emergencyPhone"
										type="text"
										bind:value={emergencyPhone}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Right Column -->
					<div class="space-y-6">
						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Payment Type</h3>
							<div>
								<label for="paymentType" class="block text-xs font-medium text-gray-700 mb-1">Payment Type</label>
								<select
									id="paymentType"
									bind:value={paymentType}
									class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
								>
									<option value="Hourly">Hourly</option>
									<option value="Daily">Daily</option>
									<option value="Monthly">Monthly</option>
								</select>
							</div>
							{#if paymentType === 'Hourly'}
								<div class="mt-4">
									<label for="hourlyRate" class="block text-xs font-medium text-gray-700 mb-1">Hourly Rate</label>
									<input
										id="hourlyRate"
										type="number"
										bind:value={hourlyRate}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
							{/if}
							{#if paymentType === 'Daily'}
								<div class="mt-4">
									<label for="dailyRate" class="block text-xs font-medium text-gray-700 mb-1">Daily Rate</label>
									<input
										id="dailyRate"
										type="number"
										bind:value={dailyRate}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
							{/if}
							{#if paymentType === 'Monthly'}
								<div class="mt-4">
									<label for="monthlySalary" class="block text-xs font-medium text-gray-700 mb-1">Monthly Salary</label>
									<input
										id="monthlySalary"
										type="number"
										bind:value={monthlySalary}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
							{/if}
						</div>

						<div class="border-b border-gray-200 pb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Payment Details</h3>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="paymentMethod" class="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
									<select
										id="paymentMethod"
										bind:value={paymentMethod}
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									>
										<option value="">Select Method</option>
										<option value="Bank">Bank</option>
										<option value="Mobile Money">Mobile Money</option>
										<option value="Cash">Cash</option>
									</select>
								</div>
								<div>
									<label for="paymentMethodName" class="block text-xs font-medium text-gray-700 mb-1">Payment Method Name</label>
									{#if paymentMethod === 'Bank'}
										<select
											id="paymentMethodName"
											bind:value={paymentMethodName}
											class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										>
											<option value="">Select Bank</option>
											<option value="National Bank of Malawi">National Bank of Malawi</option>
											<option value="Standard Bank Malawi">Standard Bank Malawi</option>
											<option value="FDH Bank">FDH Bank</option>
											<option value="First Capital Bank Malawi">First Capital Bank Malawi</option>
											<option value="NBS Bank">NBS Bank</option>
											<option value="Ecobank Malawi">Ecobank Malawi</option>
											<option value="CDH Investment Bank">CDH Investment Bank</option>
											<option value="Centenary Bank Malawi">Centenary Bank Malawi</option>
										</select>
									{:else if paymentMethod === 'Mobile Money'}
										<select
											id="paymentMethodName"
											bind:value={paymentMethodName}
											class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										>
											<option value="">Select Provider</option>
											<option value="Airtel">Airtel</option>
											<option value="TNM">TNM</option>
											<option value="Epay">Epay</option>
										</select>
									{:else}
										<input
											id="paymentMethodName"
											type="text"
											bind:value={paymentMethodName}
											placeholder="Payment method name"
											class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
										/>
									{/if}
								</div>
								<div>
									<label for="accountName" class="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
									<input
										id="accountName"
										type="text"
										bind:value={accountName}
										placeholder="Account holder name"
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
								<div>
									<label for="accountNumber" class="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
									<input
										id="accountNumber"
										type="text"
										bind:value={accountNumber}
										placeholder="Account number"
										class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
									/>
								</div>
							</div>
						</div>

						<div class="border-t border-gray-200 pt-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Employee Documents</h3>
							<div class="space-y-4">
								<div>
									<label for="employeeDocType" class="block text-xs font-medium text-gray-700 mb-1">Employee Document Type</label>
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
							</div>

							{#if documents.length > 0}
								<div class="mt-4 space-y-3">
									<h4 class="text-xs font-medium text-gray-700">Selected Files:</h4>
									{#each documents as doc, index}
										<div class="bg-gray-50 p-3 rounded">
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
							{/if}

							{#if uploadingDocuments}
								<div class="mt-4 flex items-center gap-2 text-xs text-gray-600">
									<Icon icon="mdi:loading" class="w-4 h-4 animate-spin" />
									Uploading documents...
								</div>
							{/if}
						</div>

						<div>
							<label for="notes" class="block text-xs font-medium text-gray-700 mb-1">Notes</label>
							<textarea
								id="notes"
								bind:value={notes}
								rows="3"
								class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							></textarea>
						</div>
					</div>
				</div>

				<div class="flex gap-3 mt-6 pt-6 border-t border-gray-200 justify-between">
					<button
						type="button"
						onclick={cancel}
						disabled={submitting}
						class="bg-gray-200 text-gray-700 py-2 px-4 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={submitting}
						class="bg-[#5fc5c0] text-white py-2 px-4 hover:bg-[#114a4b] focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
					>
						{submitting ? 'Updating Employee…' : 'Update Employee'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
