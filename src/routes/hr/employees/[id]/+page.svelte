<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let employee = $state<any>(null);
	let loading = $state(true);

	onMount(async () => {
		const id = $page.params.id;
		if (id) {
			await loadEmployee(id);
		}
	});

	async function loadEmployee(id: string) {
		try {
			loading = true;
			const response = await fetch(`/api/employees?id=${id}`);
			if (response.ok) {
				employee = await response.json();
			}
		} catch (error) {
			console.error('Error loading employee:', error);
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	function formatCurrency(amount: string | null) {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(Number(amount));
	}

	function goBack() {
		goto('/hr/employees');
	}
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<button
				onclick={goBack}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
			>
				<Icon icon="mdi:arrow-left" class="w-5 h-5" />
				Back to Employees
			</button>
			<div class="flex gap-2">
				<button
					onclick={() => goto(`/hr/employees/${employee?.id}/edit`)}
					class="flex items-center gap-2 bg-[#5fc5c0] text-white px-4 py-2 text-sm font-medium hover:bg-[#4db5b0] transition-colors rounded-lg shadow-sm"
				>
					<Icon icon="mdi:pencil" class="w-4 h-4" />
					Edit Employee
				</button>
			</div>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Loading employee details...</div>
			</div>
		{:else if employee}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Left Column - Profile Card -->
				<div class="lg:col-span-1">
					<div class="bg-white shadow-lg rounded-xl p-6 sticky top-6">
						<div class="flex flex-col items-center text-center">
							<div class="w-32 h-32 bg-gradient-to-br from-[#5fc5c0] to-[#114a4b] rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-lg">
								{employee.firstname[0]}{employee.lastname[0]}
							</div>
							<h1 class="text-2xl font-bold text-gray-800">
								{employee.firstname} {employee.lastname}
							</h1>
							<p class="text-gray-500 text-sm mt-1">Employee #{employee.employeeNumber}</p>
							
							<div class="flex flex-wrap gap-2 mt-4 justify-center">
								<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
									{employee.employmentStatus}
								</span>
								{#if employee.department}
									<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
										{employee.department.name}
									</span>
								{/if}
								{#if employee.employmentType}
									<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
										{employee.employmentType}
									</span>
								{/if}
							</div>
						</div>

						<div class="mt-6 pt-6 border-t border-gray-200">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Quick Contact</h3>
							<div class="space-y-3">
								{#if employee.email}
									<div class="flex items-center gap-3">
										<Icon icon="mdi:email" class="w-5 h-5 text-[#5fc5c0]" />
										<a href="mailto:{employee.email}" class="text-sm text-gray-600 hover:text-[#5fc5c0]">
											{employee.email}
										</a>
									</div>
								{/if}
								{#if employee.phone}
									<div class="flex items-center gap-3">
										<Icon icon="mdi:phone" class="w-5 h-5 text-[#5fc5c0]" />
										<a href="tel:{employee.phone}" class="text-sm text-gray-600 hover:text-[#5fc5c0]">
											{employee.phone}
										</a>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Right Column - Details -->
				<div class="lg:col-span-2 space-y-6">
					<!-- Personal Information -->
					<div class="bg-white shadow-lg rounded-xl p-6">
						<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<Icon icon="mdi:account" class="w-5 h-5 text-[#5fc5c0]" />
							Personal Information
						</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
								<p class="text-xs text-gray-500 mb-1">National ID</p>
								<p class="text-sm font-medium text-gray-800">{employee.nationalId || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Passport Number</p>
								<p class="text-sm font-medium text-gray-800">{employee.passportNumber || 'N/A'}</p>
							</div>
						</div>
					</div>

					<!-- Employment Details -->
					<div class="bg-white shadow-lg rounded-xl p-6">
						<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<Icon icon="mdi:briefcase" class="w-5 h-5 text-[#5fc5c0]" />
							Employment Details
						</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Department</p>
								<p class="text-sm font-medium text-gray-800">{employee.department?.name || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Branch</p>
								<p class="text-sm font-medium text-gray-800">{employee.branch?.name || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Employment Type</p>
								<p class="text-sm font-medium text-gray-800">{employee.employmentType || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Employment Status</p>
								<p class="text-sm font-medium text-gray-800">{employee.employmentStatus}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Hire Date</p>
								<p class="text-sm font-medium text-gray-800">{formatDate(employee.hireDate)}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Termination Date</p>
								<p class="text-sm font-medium text-gray-800">{formatDate(employee.terminationDate)}</p>
							</div>
						</div>
					</div>

					<!-- Payment Information -->
					<div class="bg-white shadow-lg rounded-xl p-6">
						<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
							<Icon icon="mdi:cash" class="w-5 h-5 text-[#5fc5c0]" />
							Payment Information
						</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Payment Type</p>
								<p class="text-sm font-medium text-gray-800">{employee.paymentType}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Hourly Rate</p>
								<p class="text-sm font-medium text-gray-800">{formatCurrency(employee.hourlyRate)}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Daily Rate</p>
								<p class="text-sm font-medium text-gray-800">{formatCurrency(employee.dailyRate)}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Monthly Salary</p>
								<p class="text-sm font-medium text-gray-800">{formatCurrency(employee.monthlySalary)}</p>
							</div>
						</div>
						
						<h3 class="text-md font-semibold text-gray-700 mb-3 mt-6">Payment Details</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Payment Method</p>
								<p class="text-sm font-medium text-gray-800">{employee.paymentMethod || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Payment Method Name</p>
								<p class="text-sm font-medium text-gray-800">{employee.paymentMethodName || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Account Name</p>
								<p class="text-sm font-medium text-gray-800">{employee.accountName || 'N/A'}</p>
							</div>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-xs text-gray-500 mb-1">Account Number</p>
								<p class="text-sm font-medium text-gray-800">{employee.accountNumber || 'N/A'}</p>
							</div>
						</div>
					</div>

					<!-- Address & Emergency Contact -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="bg-white shadow-lg rounded-xl p-6">
							<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Icon icon="mdi:map-marker" class="w-5 h-5 text-[#5fc5c0]" />
								Address
							</h2>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-sm text-gray-700 whitespace-pre-wrap">{employee.address || 'N/A'}</p>
							</div>
						</div>

						<div class="bg-white shadow-lg rounded-xl p-6">
							<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Icon icon="mdi:phone-alert" class="w-5 h-5 text-[#5fc5c0]" />
								Emergency Contact
							</h2>
							<div class="space-y-3">
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Contact Name</p>
									<p class="text-sm font-medium text-gray-800">{employee.emergencyContact || 'N/A'}</p>
								</div>
								<div class="bg-gray-50 p-4 rounded-lg">
									<p class="text-xs text-gray-500 mb-1">Phone</p>
									<p class="text-sm font-medium text-gray-800">{employee.emergencyPhone || 'N/A'}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Notes -->
					{#if employee.notes}
						<div class="bg-white shadow-lg rounded-xl p-6">
							<h2 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
								<Icon icon="mdi:note-text" class="w-5 h-5 text-[#5fc5c0]" />
								Notes
							</h2>
							<div class="bg-gray-50 p-4 rounded-lg">
								<p class="text-sm text-gray-700 whitespace-pre-wrap">{employee.notes}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Employee not found</div>
			</div>
		{/if}
	</div>
</div>
