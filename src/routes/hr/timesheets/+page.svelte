<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let timesheets = $state<any[]>([]);
	let employees = $state<any[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);

	// Form state
	let employeeId = $state('');
	let date = $state('');
	let startTime = $state('');
	let endTime = $state('');
	let breakMinutes = $state('0');
	let description = $state('');

	async function loadTimesheets() {
		try {
			const response = await fetch('/api/timesheets');
			if (response.ok) {
				timesheets = await response.json();
			}
		} catch (error) {
			console.error('Error loading timesheets:', error);
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

	async function createTimesheet() {
		try {
			const response = await fetch('/api/timesheets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employeeId,
					date,
					startTime,
					endTime,
					breakMinutes,
					description
				})
			});

			if (response.ok) {
				closeAddModal();
				await loadTimesheets();
			}
		} catch (error) {
			console.error('Error creating timesheet:', error);
		}
	}

	function openAddModal() {
		showAddModal = true;
		// Set default date to today
		date = new Date().toISOString().split('T')[0];
	}

	function closeAddModal() {
		showAddModal = false;
		employeeId = '';
		date = '';
		startTime = '';
		endTime = '';
		breakMinutes = '0';
		description = '';
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Approved':
				return 'bg-green-100 text-green-700';
			case 'Rejected':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-yellow-100 text-yellow-700';
		}
	}

	onMount(() => {
		loadTimesheets();
		loadEmployees();
	});
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-800">Timesheets</h1>
		<button
			onclick={openAddModal}
			class="bg-[#5fc5c0] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4db5b0] transition-colors"
		>
			Add Timesheet
		</button>
	</div>

	{#if loading}
		<p class="text-gray-500">Loading timesheets...</p>
	{:else if timesheets.length === 0}
		<p class="text-gray-500">No timesheets found.</p>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Start Time</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">End Time</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Regular Hours</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Overtime Hours</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each timesheets as timesheet}
						<tr class="border-t border-gray-200 hover:bg-gray-50">
							<td class="px-4 py-3 text-xs font-medium text-gray-800">
								{timesheet.employee?.firstname} {timesheet.employee?.lastname}
								<span class="text-gray-500">({timesheet.employee?.employeeNumber})</span>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{new Date(timesheet.date).toLocaleDateString()}
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{new Date(timesheet.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{timesheet.endTime ? new Date(timesheet.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">{timesheet.regularHours}h</td>
							<td class="px-4 py-3 text-xs text-gray-600">{timesheet.overtimeHours}h</td>
							<td class="px-4 py-3">
								<span class="text-xs px-2 py-1 rounded {getStatusColor(timesheet.status)}">
									{timesheet.status}
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
				<h2 class="text-lg font-bold text-gray-800">Add Timesheet</h2>
				<button onclick={closeAddModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="employeeId" class="block text-xs font-medium text-gray-700 mb-1">Employee</label>
					<select
						id="employeeId"
						bind:value={employeeId}
						class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					>
						<option value="">Select Employee</option>
						{#each employees as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="timesheetDate" class="block text-xs font-medium text-gray-700 mb-1">Date</label>
					<input
						id="timesheetDate"
						type="date"
						bind:value={date}
						class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="startTime" class="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
						<input
							id="startTime"
							type="time"
							bind:value={startTime}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="endTime" class="block text-xs font-medium text-gray-700 mb-1">End Time</label>
						<input
							id="endTime"
							type="time"
							bind:value={endTime}
							class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>

				<div>
					<label for="breakMinutes" class="block text-xs font-medium text-gray-700 mb-1">Break Minutes</label>
					<input
						id="breakMinutes"
						type="number"
						bind:value={breakMinutes}
						class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					/>
				</div>

				<div>
					<label for="description" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="description"
						bind:value={description}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						onclick={closeAddModal}
						class="px-4 py-2 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						onclick={createTimesheet}
						class="px-4 py-2 bg-[#5fc5c0] text-white rounded text-xs hover:bg-[#4db5b0]"
					>
						Save Timesheet
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
