<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

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
	let paymentMethod = $state('');
	let paymentMethodName = $state('');
	let accountName = $state('');
	let accountNumber = $state('');

	function generateEmployeeNumber() {
		const num = Math.floor(100000 + Math.random() * 900000);
		return num.toString();
	}

	onMount(() => {
		employeeNumber = generateEmployeeNumber();
	});

	async function createEmployee() {
		try {
			submitting = true;
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
					branchId: branchId || null,
					paymentMethod,
					paymentMethodName,
					accountName,
					accountNumber
				})
			});

			if (response.ok) {
				goto('/hr/employees');
			}
		} catch (error) {
			console.error('Error creating employee:', error);
		} finally {
			submitting = false;
		}
	}

	function cancel() {
		goto('/hr/employees');
	}
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-gray-800">Add New Employee</h1>
			<button
				onclick={cancel}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
			>
				<Icon icon="mdi:arrow-left" class="w-4 h-4" />
				Back to Employees
			</button>
		</div>

		<div class="bg-white shadow-lg p-6">
			<form onsubmit={createEmployee}>
				<div class="border-b border-gray-200 pb-4 mb-4">
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
				</div>

				<div class="border-b border-gray-200 pb-4 mb-4">
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
								<option value="1">Engineering</option>
								<option value="2">Marketing</option>
								<option value="3">Sales</option>
								<option value="4">HR</option>
								<option value="5">Finance</option>
							</select>
						</div>
						<div>
							<label for="hireDate" class="block text-xs font-medium text-gray-700 mb-1">Hire Date</label>
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

				<div class="border-b border-gray-200 pb-4 mb-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Payment Type</h3>
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

				<div class="border-b border-gray-200 pb-4 mb-4">
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
							<input
								id="paymentMethodName"
								type="text"
								bind:value={paymentMethodName}
								placeholder="Bank name or Mobile Money provider"
								class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							/>
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
								placeholder="Bank account number or Mobile Money number"
								class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							/>
						</div>
					</div>
				</div>

				<div class="border-b border-gray-200 pb-4 mb-4">
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

				<div class="pb-4 mb-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
					<div>
						<label for="notes" class="block text-xs font-medium text-gray-700 mb-1">Additional Notes</label>
						<textarea
							id="notes"
							bind:value={notes}
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						></textarea>
					</div>
				</div>

				<div class="flex gap-3">
					<button
						type="submit"
						disabled={submitting}
						class="bg-[#5fc5c0] text-white py-2 px-4 hover:bg-[#114a4b] focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
					>
						{submitting ? 'Creating Employee…' : 'Create Employee'}
					</button>
					<button
						type="button"
						onclick={cancel}
						disabled={submitting}
						class="bg-gray-200 text-gray-700 py-2 px-4 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
