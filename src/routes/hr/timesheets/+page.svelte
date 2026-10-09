<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	let timesheets = $state<any[]>([]);
	let employees = $state<any[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let selectedStatus = $state('All');
	let attendanceFilter = $state('All');
	let employeeFilter = $state('All');
	let searchQuery = $state('');

	let employeeId = $state('');
	let date = $state('');
	let startTime = $state('');
	let endTime = $state('');
	let breakMinutes = $state('0');
	let description = $state('');
	let attendanceStatus = $state('Present');

	function getFilteredTimesheets() {
		return timesheets.filter((timesheet) => {
			const employeeName = `${timesheet.employee?.firstname ?? ''} ${timesheet.employee?.lastname ?? ''}`.trim();
			const matchesStatus = selectedStatus === 'All' || timesheet.status === selectedStatus;
			const matchesAttendance = attendanceFilter === 'All' || (timesheet.attendanceStatus ?? 'Present') === attendanceFilter;
			const matchesEmployee = employeeFilter === 'All' || String(timesheet.employeeId) === employeeFilter;
			const matchesSearch = !searchQuery || employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || timesheet.employee?.employeeNumber?.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesStatus && matchesAttendance && matchesEmployee && matchesSearch;
		});
	}

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
		if (!employeeId || !date || !startTime || !endTime) return;

		try {
			const response = await fetch('/api/timesheets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ employeeId, date, startTime, endTime, breakMinutes, description, attendanceStatus })
			});

			if (response.ok) {
				closeAddModal();
				await loadTimesheets();
			}
		} catch (error) {
			console.error('Error creating timesheet:', error);
		}
	}

	async function updateTimesheetStatus(id: string, status: 'Approved' | 'Rejected') {
		try {
			const response = await fetch('/api/timesheets', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, status })
			});

			if (response.ok) {
				await loadTimesheets();
			}
		} catch (error) {
			console.error('Error updating timesheet status:', error);
		}
	}

	function openAddModal() {
		showAddModal = true;
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
		attendanceStatus = 'Present';
	}

	function getAttendanceColor(status: string) {
		switch (status) {
			case 'Present': return 'bg-emerald-100 text-emerald-700';
			case 'Late': return 'bg-amber-100 text-amber-700';
			case 'Sick': return 'bg-red-100 text-red-700';
			case 'Absent': return 'bg-gray-200 text-gray-700';
			case 'Leave': return 'bg-sky-100 text-sky-700';
			default: return 'bg-gray-100 text-gray-700';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'Approved': return 'bg-green-100 text-green-700';
			case 'Rejected': return 'bg-red-100 text-red-700';
			default: return 'bg-yellow-100 text-yellow-700';
		}
	}

	function formatHours(value: string | number | null | undefined) {
		const amount = Number(value ?? 0);
		return Number.isFinite(amount) ? `${amount.toFixed(2)}h` : '0.00h';
	}

	function getTotalHours(regularHours: number | null | undefined, overtimeHours: number | null | undefined) {
		const regular = Number(regularHours ?? 0);
		const overtime = Number(overtimeHours ?? 0);
		const total = regular + overtime;
		return Number.isFinite(total) ? `${total.toFixed(2)}h` : '0.00h';
	}

	function getSummary() {
		const pending = timesheets.filter((item) => item.status === 'Pending').length;
		const approved = timesheets.filter((item) => item.status === 'Approved').length;
		const totalHours = timesheets.reduce((sum, item) => sum + Number(item.regularHours ?? 0) + Number(item.overtimeHours ?? 0), 0);
		return { pending, approved, totalHours };
	}

	onMount(() => {
		loadTimesheets();
		loadEmployees();
	});
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6 gap-4 flex-wrap">
		<div>
			<p class="text-xs uppercase tracking-wide text-[#5fc5c0] font-semibold">Human resources</p>
			<h1 class="text-2xl font-bold text-gray-800">Timesheets</h1>
		</div>
		<button onclick={openAddModal} class="bg-[#5fc5c0] text-white px-4 py-2 rounded-none text-sm font-medium hover:bg-[#4db5b0] transition-colors">
			Add Timesheet
		</button>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="bg-white border border-gray-200 rounded-none p-4">
			<p class="text-xs uppercase text-gray-500">Pending</p>
			<h2 class="text-2xl font-bold text-gray-800 mt-2">{getSummary().pending}</h2>
		</div>
		<div class="bg-white border border-gray-200 rounded-none p-4">
			<p class="text-xs uppercase text-gray-500">Approved</p>
			<h2 class="text-2xl font-bold text-gray-800 mt-2">{getSummary().approved}</h2>
		</div>
		<div class="bg-white border border-gray-200 rounded-none p-4">
			<p class="text-xs uppercase text-gray-500">Total hours</p>
			<h2 class="text-2xl font-bold text-gray-800 mt-2">{getSummary().totalHours.toFixed(2)}</h2>
		</div>
	</div>

	<div class="bg-white border border-gray-200 rounded-none p-4 mb-6">
		<div class="flex flex-col md:flex-row gap-3 md:items-center">
			<input type="text" placeholder="Search employee or employee number" bind:value={searchQuery} class="flex-1 px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] rounded-none" />
			<select bind:value={selectedStatus} class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] rounded-none">
				<option value="All">All statuses</option>
				<option value="Pending">Pending</option>
				<option value="Approved">Approved</option>
				<option value="Rejected">Rejected</option>
			</select>
			<select bind:value={attendanceFilter} class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] rounded-none">
				<option value="All">All attendance</option>
				<option value="Present">Present</option>
				<option value="Late">Late</option>
				<option value="Sick">Sick</option>
				<option value="Absent">Absent</option>
				<option value="Leave">Leave</option>
			</select>
			<select bind:value={employeeFilter} class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] rounded-none">
				<option value="All">All employees</option>
				{#each employees as employee}
					<option value={String(employee.id)}>{employee.firstname} {employee.lastname}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if loading}
		<p class="text-gray-500">Loading timesheets...</p>
	{:else if getFilteredTimesheets().length === 0}
		<div class="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">No timesheets match this filter.</div>
	{:else}
		<div class="bg-white border border-gray-200 rounded-none overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Work Shift</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Attendance</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Hours Worked</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Regular</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Overtime</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each getFilteredTimesheets() as timesheet}
						<tr class="border-t border-gray-200 hover:bg-gray-50">
							<td class="px-4 py-3 text-xs font-medium text-gray-800">
								<div class="font-semibold">{timesheet.employee?.firstname} {timesheet.employee?.lastname}</div>
								<div class="text-[10px] text-gray-500">{timesheet.employee?.employeeNumber}</div>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">{new Date(timesheet.date).toLocaleDateString()}</td>
							<td class="px-4 py-3 text-xs text-gray-600">{new Date(timesheet.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {timesheet.endTime ? new Date(timesheet.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
						<td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded {getAttendanceColor(timesheet.attendanceStatus ?? 'Present')}">{timesheet.attendanceStatus ?? 'Present'}</span></td>
						<td class="px-4 py-3 text-xs text-gray-600 font-semibold text-[#114a4b]">{getTotalHours(timesheet.regularHours, timesheet.overtimeHours)}</td>
						<td class="px-4 py-3 text-xs text-gray-600">{formatHours(timesheet.regularHours)}</td>
							<td class="px-4 py-3 text-xs text-gray-600">{formatHours(timesheet.overtimeHours)}</td>
							<td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded {getStatusColor(timesheet.status)}">{timesheet.status}</span></td>
							<td class="px-4 py-3">
								<div class="flex gap-2">
									{#if timesheet.status !== 'Approved'}
										<button onclick={() => updateTimesheetStatus(timesheet.id, 'Approved')} class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Approve</button>
									{/if}
									{#if timesheet.status !== 'Rejected'}
										<button onclick={() => updateTimesheetStatus(timesheet.id, 'Rejected')} class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Reject</button>
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
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
		<div class="bg-white rounded-none p-6 w-full max-w-lg shadow-xl">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-lg font-bold text-gray-800">Add Timesheet</h2>
				<button onclick={closeAddModal} class="text-gray-500 hover:text-gray-700"><Icon icon="mdi:close" class="w-5 h-5" /></button>
			</div>
			<div class="space-y-4">
				<div>
					<label for="employeeId" class="block text-xs font-medium text-gray-700 mb-1">Employee</label>
					<select id="employeeId" bind:value={employeeId} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						<option value="">Select Employee</option>
						{#each employees as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="timesheetDate" class="block text-xs font-medium text-gray-700 mb-1">Date</label>
					<input id="timesheetDate" type="date" bind:value={date} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="startTime" class="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
						<input id="startTime" type="time" bind:value={startTime} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="endTime" class="block text-xs font-medium text-gray-700 mb-1">End Time</label>
						<input id="endTime" type="time" bind:value={endTime} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>
				<div>
					<label for="attendanceStatus" class="block text-xs font-medium text-gray-700 mb-1">Attendance Status</label>
					<select id="attendanceStatus" bind:value={attendanceStatus} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
						<option value="Present">Present</option>
						<option value="Late">Late</option>
						<option value="Sick">Sick</option>
						<option value="Absent">Absent</option>
						<option value="Leave">Leave</option>
					</select>
				</div>
				<div>
					<label for="breakMinutes" class="block text-xs font-medium text-gray-700 mb-1">Break Minutes</label>
					<input id="breakMinutes" type="number" bind:value={breakMinutes} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
				</div>
				<div>
					<label for="description" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea id="description" bind:value={description} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"></textarea>
				</div>
			</div>
			<div class="mt-6 flex justify-end gap-3">
				<button onclick={closeAddModal} class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-none">Cancel</button>
				<button onclick={createTimesheet} class="bg-[#5fc5c0] text-white px-4 py-2 text-sm font-medium hover:bg-[#4db5b0] rounded-none">Save Timesheet</button>
			</div>
		</div>
	</div>
{/if}
