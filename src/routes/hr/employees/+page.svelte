<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let employees = $state<any[]>([]);
	let filteredEmployees = $state<any[]>([]);
	let loading = $state(true);
	let activeDropdownId = $state<string | null>(null);
	let searchQuery = $state('');
	let filterDepartment = $state('');
	let filterStatus = $state('');
	let filterEmploymentType = $state('');

	async function loadEmployees() {
		try {
			const response = await fetch('/api/employees');
			if (response.ok) {
				employees = await response.json();
				filterEmployees();
			}
		} catch (error) {
			console.error('Error loading employees:', error);
		} finally {
			loading = false;
		}
	}

	function filterEmployees() {
		filteredEmployees = employees.filter(employee => {
			const matchesSearch = !searchQuery || 
				employee.firstname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				employee.lastname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				employee.employeeNumber?.toLowerCase().includes(searchQuery.toLowerCase());
			
			const matchesDepartment = !filterDepartment || employee.department?.name === filterDepartment;
			const matchesStatus = !filterStatus || employee.employmentStatus === filterStatus;
			const matchesEmploymentType = !filterEmploymentType || employee.employmentType === filterEmploymentType;
			
			return matchesSearch && matchesDepartment && matchesStatus && matchesEmploymentType;
		});
	}

	$effect(() => {
		filterEmployees();
	});

	function toggleDropdown(id: string) {
		activeDropdownId = activeDropdownId === id ? null : id;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Active':
				return 'bg-green-100 text-green-700';
			case 'Inactive':
				return 'bg-gray-100 text-gray-600';
			case 'On Leave':
				return 'bg-yellow-100 text-yellow-700';
			case 'Terminated':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-blue-100 text-blue-700';
		}
	}

	function getPaymentTypeIcon(type: string) {
		switch (type) {
			case 'Hourly':
				return 'mdi:clock-outline';
			case 'Daily':
				return 'mdi:calendar-day';
			case 'Monthly':
				return 'mdi:calendar-month';
			default:
				return 'mdi:cash';
		}
	}

	onMount(() => {
		loadEmployees();
	});
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-800">Employees</h1>
		<button
			onclick={() => goto('/hr/employees/add')}
			class="bg-[#5fc5c0] text-white px-4 py-2 text-sm font-medium hover:bg-[#4db5b0] transition-colors flex items-center gap-2"
		>
			<Icon icon="mdi:account-plus" class="w-4 h-4" />
			Add Employee
		</button>
	</div>

	<!-- Search and Filters -->
	<div class="bg-white p-4 border border-gray-200 mb-4">
		<div class="flex gap-4 items-center">
			<div class="flex-1">
				<input
					type="text"
					placeholder="Search by name, email, or employee number..."
					bind:value={searchQuery}
					class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
				/>
			</div>
			<select
				bind:value={filterDepartment}
				class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
			>
				<option value="">All Departments</option>
				<option value="Engineering">Engineering</option>
				<option value="Marketing">Marketing</option>
				<option value="Sales">Sales</option>
				<option value="HR">HR</option>
				<option value="Finance">Finance</option>
			</select>
			<select
				bind:value={filterStatus}
				class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
			>
				<option value="">All Status</option>
				<option value="Active">Active</option>
				<option value="Inactive">Inactive</option>
				<option value="On Leave">On Leave</option>
			</select>
			<select
				bind:value={filterEmploymentType}
				class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
			>
				<option value="">All Types</option>
				<option value="Full-time">Full-time</option>
				<option value="Part-time">Part-time</option>
				<option value="Contract">Contract</option>
				<option value="Intern">Intern</option>
			</select>
		</div>
	</div>

	{#if loading}
		<p class="text-xs text-gray-500">Loading employees...</p>
	{:else}
		{#if filteredEmployees.length === 0}
			<p class="text-xs text-gray-500 mb-4">No employees found. Click "Add Employee" to create your first employee.</p>
		{/if}
		<div class="overflow-visible">
			<table class="w-full border-collapse overflow-visible">
				<thead class="overflow-visible">
					<tr class="border-b border-gray-200 bg-gray-50 overflow-visible">
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Employee</th>
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Contact</th>
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Personal Info</th>
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Employment</th>
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Department</th>
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Status</th>
						<th class="text-left text-xs font-semibold text-gray-700 py-3 px-4">Actions</th>
					</tr>
				</thead>
				<tbody class="overflow-visible">
					{#each filteredEmployees as employee}
						<tr class="border-b border-gray-100 hover:bg-gray-50 overflow-visible">
							<td class="py-3 px-4">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 bg-gradient-to-br from-[#5fc5c0] to-[#114a4b] rounded-full flex items-center justify-center text-white text-xs font-bold">
										{employee.firstname[0]}{employee.lastname[0]}
									</div>
									<div>
										<button
											onclick={() => goto(`/hr/employees/${employee.id}`)}
											class="text-sm font-medium text-gray-800 hover:text-[#5fc5c0] transition-colors"
										>
											{employee.firstname} {employee.lastname}
										</button>
										<p class="text-xs text-gray-500">{employee.employeeNumber}</p>
									</div>
								</div>
							</td>
							<td class="py-3 px-4">
								{#if employee.email}
									<p class="text-xs text-gray-600">{employee.email}</p>
								{/if}
								{#if employee.phone}
									<p class="text-xs text-gray-500">{employee.phone}</p>
								{/if}
							</td>
							<td class="py-3 px-4">
								{#if employee.nationality}
									<p class="text-xs text-gray-600">{employee.nationality}</p>
								{/if}
								{#if employee.gender}
									<p class="text-xs text-gray-500">{employee.gender}</p>
								{/if}
								{#if employee.hireDate}
									<p class="text-xs text-gray-500">Hired: {new Date(employee.hireDate).toLocaleDateString()}</p>
								{/if}
							</td>
							<td class="py-3 px-4">
								{#if employee.employmentType}
									<span class="text-[10px] px-2 py-1 bg-blue-50 text-blue-700">{employee.employmentType}</span>
								{/if}
								<div class="flex items-center gap-1 mt-1">
									<Icon icon={getPaymentTypeIcon(employee.paymentType)} class="w-3 h-3 text-gray-500" />
									<span class="text-[10px] text-gray-500">{employee.paymentType}</span>
								</div>
							</td>
							<td class="py-3 px-4">
								{#if employee.department}
									<span class="text-[10px] px-2 py-1 bg-gray-100 text-gray-600">{employee.department.name}</span>
								{/if}
							</td>
							<td class="py-3 px-4">
								<span class="text-[10px] px-2 py-1 {getStatusColor(employee.employmentStatus)}">
									{employee.employmentStatus}
								</span>
							</td>
							<td class="py-3 px-4 overflow-visible">
								<div class="relative inline-block">
									<button
										onclick={() => toggleDropdown(employee.id.toString())}
										class="text-gray-500 hover:text-gray-700 p-1"
									>
										<Icon icon="mdi:dots-vertical" class="w-4 h-4" />
									</button>
									
									{#if activeDropdownId === employee.id.toString()}
										<div class="absolute right-0 top-full mt-1 bg-white shadow-lg border border-gray-200 py-1 z-[60] min-w-[140px]">
											<button
												onclick={() => goto(`/hr/employees/${employee.id}`)}
												class="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:eye" class="w-4 h-4" />
												View Details
											</button>
											<button
												class="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:pencil" class="w-4 h-4" />
												Edit
											</button>
											<button
												class="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:folder-account" class="w-4 h-4" />
												Documents
											</button>
											<button
												class="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:delete" class="w-4 h-4" />
												Delete
											</button>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
