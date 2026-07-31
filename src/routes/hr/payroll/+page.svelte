<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let payrollRecords = $state<any[]>([]);
	let employees = $state<any[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);

	// Form state
	let employeeId = $state('');
	let payPeriodStart = $state('');
	let payPeriodEnd = $state('');
	let regularHours = $state('0');
	let overtimeHours = $state('0');
	let allowances = $state('0');
	let deductions = $state('0');
	let bonuses = $state('0');

	async function loadPayroll() {
		try {
			const response = await fetch('/api/payroll');
			if (response.ok) {
				payrollRecords = await response.json();
			}
		} catch (error) {
			console.error('Error loading payroll records:', error);
		} finally {
			loading = false;
		}
	}

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

	async function createPayroll() {
		try {
			const response = await fetch('/api/payroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employeeId,
					payPeriodStart,
					payPeriodEnd,
					regularHours,
					overtimeHours,
					allowances,
					deductions,
					bonuses
				})
			});

			if (response.ok) {
				closeAddModal();
				await loadPayroll();
			}
		} catch (error) {
			console.error('Error creating payroll record:', error);
		}
	}

	function openAddModal() {
		showAddModal = true;
		// Set default dates to current month
		const now = new Date();
		const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		payPeriodStart = firstDay.toISOString().split('T')[0];
		payPeriodEnd = lastDay.toISOString().split('T')[0];
	}

	function closeAddModal() {
		showAddModal = false;
		employeeId = '';
		payPeriodStart = '';
		payPeriodEnd = '';
		regularHours = '0';
		overtimeHours = '0';
		allowances = '0';
		deductions = '0';
		bonuses = '0';
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Approved':
				return 'bg-green-100 text-green-700';
			case 'Paid':
				return 'bg-blue-100 text-blue-700';
			case 'Calculated':
				return 'bg-purple-100 text-purple-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function formatCurrency(value: string) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(parseFloat(value));
	}

	onMount(() => {
		loadPayroll();
		loadEmployees();
	});
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-800">Payroll</h1>
		<button
			onclick={openAddModal}
			class="bg-[#5fc5c0] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4db5b0] transition-colors"
		>
			Create Payroll
		</button>
	</div>

	{#if loading}
		<p class="text-gray-500">Loading payroll records...</p>
	{:else if payrollRecords.length === 0}
		<p class="text-gray-500">No payroll records found.</p>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pay Period</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Payment Type</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Regular Hours</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Overtime Hours</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Gross Pay</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Net Pay</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each payrollRecords as payroll}
						<tr class="border-t border-gray-200 hover:bg-gray-50">
							<td class="px-4 py-3 text-xs font-medium text-gray-800">
								{payroll.employee?.firstname} {payroll.employee?.lastname}
								<span class="text-gray-500">({payroll.employee?.employeeNumber})</span>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{new Date(payroll.payPeriodStart).toLocaleDateString()} - {new Date(payroll.payPeriodEnd).toLocaleDateString()}
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">{payroll.paymentType}</td>
							<td class="px-4 py-3 text-xs text-gray-600">{payroll.regularHours}h</td>
							<td class="px-4 py-3 text-xs text-gray-600">{payroll.overtimeHours}h</td>
							<td class="px-4 py-3 text-xs text-gray-600">{formatCurrency(payroll.grossPay)}</td>
							<td class="px-4 py-3 text-xs font-medium text-gray-800">{formatCurrency(payroll.netPay)}</td>
							<td class="px-4 py-3">
								<span class="text-xs px-2 py-1 rounded {getStatusColor(payroll.status)}">
									{payroll.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if showAddModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 w-full max-w-md">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-lg font-bold text-gray-800">Create Payroll</h2>
				<button onclick={closeAddModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="payrollEmployeeId" class="block text-xs font-medium text-gray-700 mb-1">Employee</label>
					<select
						id="payrollEmployeeId"
						bind:value={employeeId}
						class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					>
						<option value="">Select Employee</option>
						{#each employees as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="payPeriodStart" class="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
						<input
							id="payPeriodStart"
							type="date"
							bind:value={payPeriodStart}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="payPeriodEnd" class="block text-xs font-medium text-gray-700 mb-1">Period End</label>
						<input
							id="payPeriodEnd"
							type="date"
							bind:value={payPeriodEnd}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="regularHours" class="block text-xs font-medium text-gray-700 mb-1">Regular Hours</label>
						<input
							id="regularHours"
							type="number"
							bind:value={regularHours}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="overtimeHours" class="block text-xs font-medium text-gray-700 mb-1">Overtime Hours</label>
						<input
							id="overtimeHours"
							type="number"
							bind:value={overtimeHours}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="allowances" class="block text-xs font-medium text-gray-700 mb-1">Allowances</label>
						<input
							id="allowances"
							type="number"
							bind:value={allowances}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="deductions" class="block text-xs font-medium text-gray-700 mb-1">Deductions</label>
						<input
							id="deductions"
							type="number"
							bind:value={deductions}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="bonuses" class="block text-xs font-medium text-gray-700 mb-1">Bonuses</label>
						<input
							id="bonuses"
							type="number"
							bind:value={bonuses}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						onclick={closeAddModal}
						class="px-4 py-2 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						onclick={createPayroll}
						class="px-4 py-2 bg-[#5fc5c0] text-white rounded text-xs hover:bg-[#4db5b0]"
					>
						Create Payroll
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
