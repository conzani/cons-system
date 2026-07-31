<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let employees = $state<any[]>([]);
	let filteredEmployees = $state<any[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let activeDropdownId = $state<string | null>(null);
	let searchQuery = $state('');
	let filterDepartment = $state('');
	let filterStatus = $state('');
	let filterEmploymentType = $state('');

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
	let nationalId = $state('');
	let passportNumber = $state('');
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

	async function createEmployee() {
		try {
			const response = await fetch('/api/employees', {
				method: 'POST',
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
					nationalId,
					passportNumber,
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
					branchId: branchId || null
				})
			});

			if (response.ok) {
				closeAddModal();
				await loadEmployees();
			}
		} catch (error) {
			console.error('Error creating employee:', error);
		}
	}

	function generateEmployeeNumber(): string {
		const num = Math.floor(100000 + Math.random() * 900000);
		return num.toString();
	}

	function openAddModal() {
		showAddModal = true;
		employeeNumber = generateEmployeeNumber();
	}

	function closeAddModal() {
		showAddModal = false;
		employeeNumber = '';
		firstname = '';
		lastname = '';
		email = '';
		phone = '';
		dateOfBirth = '';
		gender = '';
		maritalStatus = '';
		nationality = '';
		nationalId = '';
		passportNumber = '';
		employmentType = '';
		paymentType = 'Monthly';
		hourlyRate = '';
		dailyRate = '';
		monthlySalary = '';
		hireDate = '';
		address = '';
		emergencyContact = '';
		emergencyPhone = '';
		profilePicture = '';
		notes = '';
		departmentId = '';
		branchId = '';
	}

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
			onclick={openAddModal}
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
									<div class="w-8 h-8 bg-[#e8f8f7] flex items-center justify-center">
										<Icon icon="mdi:account" class="w-4 h-4 text-[#5fc5c0]" />
									</div>
									<div>
										<p class="text-sm font-medium text-gray-800">{employee.firstname} {employee.lastname}</p>
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

{#if showAddModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-xl mx-4">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-lg font-bold text-gray-800">Add Employee</h2>
				<button onclick={closeAddModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="firstname" class="block text-xs font-medium text-gray-700 mb-1">First Name</label>
						<input
							id="firstname"
							type="text"
							bind:value={firstname}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="lastname" class="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
						<input
							id="lastname"
							type="text"
							bind:value={lastname}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
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
							<option value="Other">Other</option>
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
						<label for="nationalId" class="block text-xs font-medium text-gray-700 mb-1">National ID</label>
						<input
							id="nationalId"
							type="text"
							bind:value={nationalId}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="passportNumber" class="block text-xs font-medium text-gray-700 mb-1">Passport Number</label>
						<input
							id="passportNumber"
							type="text"
							bind:value={passportNumber}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>

				<div class="border-t border-gray-200 pt-4">
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
							<label for="hireDate" class="block text-xs font-medium text-gray-700 mb-1">Hire Date</label>
							<input
								id="hireDate"
								type="date"
								bind:value={hireDate}
								class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							/>
						</div>
					</div>
				</div>

				<div>
					<label for="paymentType" class="block text-xs font-medium text-gray-700 mb-1">Payment Type</label>
					<select
						id="paymentType"
						bind:value={paymentType}
						class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					>
						<option value="Monthly">Monthly</option>
						<option value="Daily">Daily</option>
						<option value="Hourly">Hourly</option>
					</select>
				</div>

				{#if paymentType === 'Hourly'}
					<div>
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
					<div>
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
					<div>
						<label for="monthlySalary" class="block text-xs font-medium text-gray-700 mb-1">Monthly Salary</label>
						<input
							id="monthlySalary"
							type="number"
							bind:value={monthlySalary}
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				{/if}

				<div class="border-t border-gray-200 pt-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Address & Emergency Contact</h3>
					<div class="grid grid-cols-2 gap-4">
						<div class="col-span-2">
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

				<div class="border-t border-gray-200 pt-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="profilePicture" class="block text-xs font-medium text-gray-700 mb-1">Profile Picture URL</label>
							<input
								id="profilePicture"
								type="text"
								bind:value={profilePicture}
								class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							/>
						</div>
						<div class="col-span-2">
							<label for="notes" class="block text-xs font-medium text-gray-700 mb-1">Notes</label>
							<textarea
								id="notes"
								bind:value={notes}
								rows="2"
								class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							></textarea>
						</div>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						onclick={closeAddModal}
						class="px-4 py-2 border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						onclick={createEmployee}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#4db5b0]"
					>
						Save Employee
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
