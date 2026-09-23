<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { jsPDF } from 'jspdf';
	import shortLogo from '$lib/assets/shortlogo.png';

	let payrollRecords = $state<any[]>([]);
	let employees = $state<any[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let editingPayrollId = $state<string | null>(null);
	let openActionMenuId = $state<string | null>(null);
	let actionsMenuPosition = $state<{ x: number; y: number } | null>(null);
	let employeeFilter = $state('All');
	let searchQuery = $state('');
	let statusFilter = $state('All');

	// Form state
	let employeeId = $state('');
	let payPeriodStart = $state('');
	let payPeriodEnd = $state('');
	let regularHours = $state('0');
	let overtimeHours = $state('0');
	let allowances = $state('0');
	let deductions = $state('0');
	let bonuses = $state('0');
	let salaryType = $state<'Gross' | 'Net'>('Gross');
	let taxPercentage = $state('');
	let pension = $state('');
	let insurance = $state('');

	function toNumber(value: unknown, fallback = 0) {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'bigint') return Number(value);
		if (typeof value === 'string') {
			const cleaned = value.replace(/[^0-9.-]+/g, '');
			if (!cleaned || cleaned === '-' || cleaned === '.') return fallback;
			const parsed = Number.parseFloat(cleaned);
			return Number.isFinite(parsed) ? parsed : fallback;
		}
		if (value && typeof value === 'object') {
			const str = value.toString ? value.toString() : String(value);
			const cleaned = str.replace(/[^0-9.-]+/g, '');
			if (!cleaned || cleaned === '-' || cleaned === '.') return fallback;
			const parsed = Number.parseFloat(cleaned);
			return Number.isFinite(parsed) ? parsed : fallback;
		}
		return fallback;
	}

	function escapeHtml(value: unknown) {
		return String(value ?? '').replace(/[&<>"']/g, (char) => {
			const replacements: Record<string, string> = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#039;'
			};
			return replacements[char] ?? char;
		});
	}

	function resetPayrollForm() {
		employeeId = '';
		payPeriodStart = '';
		payPeriodEnd = '';
		regularHours = '0';
		overtimeHours = '0';
		allowances = '0';
		deductions = '0';
		bonuses = '0';
		salaryType = 'Gross';
		taxPercentage = '';
		pension = '';
		insurance = '';
	}

	function getSelectedEmployee() {
		return employees.find((employee) => String(employee.id) === String(employeeId)) ?? null;
	}

	function getFilteredPayrollRecords() {
		return payrollRecords.filter((payroll) => {
			const employeeName = `${payroll.employee?.firstname ?? ''} ${payroll.employee?.lastname ?? ''}`.trim();
			const matchesEmployee = employeeFilter === 'All' || String(payroll.employeeId) === employeeFilter;
			const matchesStatus = statusFilter === 'All' || payroll.status === statusFilter;
			const matchesSearch = !searchQuery || employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || payroll.employee?.employeeNumber?.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesEmployee && matchesStatus && matchesSearch;
		});
	}

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
		if (!employeeId || !payPeriodStart || !payPeriodEnd) {
			return;
		}

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
					bonuses,
					salaryType,
					taxPercentage: taxPercentage || undefined,
					pension: pension || undefined,
					insurance: insurance || undefined
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

	async function updatePayroll() {
		if (!editingPayrollId || !employeeId || !payPeriodStart || !payPeriodEnd) {
			return;
		}

		try {
			const response = await fetch('/api/payroll', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: editingPayrollId,
					employeeId,
					payPeriodStart,
					payPeriodEnd,
					regularHours,
					overtimeHours,
					allowances,
					deductions,
					bonuses,
					salaryType,
					taxPercentage: taxPercentage || undefined,
					pension: pension || undefined,
					insurance: insurance || undefined
				})
			});

			if (response.ok) {
				closeEditModal();
				await loadPayroll();
			}
		} catch (error) {
			console.error('Error updating payroll record:', error);
		}
	}

	async function deletePayroll(id: string) {
		const confirmed = window.confirm('Delete this payroll record?');
		if (!confirmed) {
			return;
		}

		try {
			const response = await fetch(`/api/payroll?id=${encodeURIComponent(id)}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				openActionMenuId = null;
				await loadPayroll();
			}
		} catch (error) {
			console.error('Error deleting payroll record:', error);
		}
	}

	async function markPayrollPaid(id: string) {
		try {
			const response = await fetch('/api/payroll', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, status: 'Paid' })
			});

			if (response.ok) {
				await loadPayroll();
			}
		} catch (error) {
			console.error('Error updating payroll status:', error);
		}
	}

	function openAddModal() {
		showAddModal = true;
		showEditModal = false;
		editingPayrollId = null;
		const now = new Date();
		const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		payPeriodStart = firstDay.toISOString().split('T')[0];
		payPeriodEnd = lastDay.toISOString().split('T')[0];
	}

	function closeAddModal() {
		showAddModal = false;
		resetPayrollForm();
	}

	function closeEditModal() {
		showEditModal = false;
		editingPayrollId = null;
		resetPayrollForm();
	}

	function openEditPayroll(payroll: any) {
		showEditModal = true;
		showAddModal = false;
		editingPayrollId = String(payroll.id);
		employeeId = String(payroll.employeeId);
		payPeriodStart = new Date(payroll.payPeriodStart).toISOString().split('T')[0];
		payPeriodEnd = new Date(payroll.payPeriodEnd).toISOString().split('T')[0];
		regularHours = String(payroll.regularHours ?? 0);
		overtimeHours = String(payroll.overtimeHours ?? 0);
		allowances = String(payroll.allowances ?? 0);
		deductions = String(payroll.deductions ?? 0);
		bonuses = String(payroll.bonuses ?? 0);
		salaryType = payroll.salaryType === 'Net' ? 'Net' : 'Gross';
		taxPercentage = payroll.taxPercentage != null ? String(payroll.taxPercentage) : '';
		pension = payroll.pensionAmount != null ? String(payroll.pensionAmount) : '';
		insurance = payroll.insuranceAmount != null ? String(payroll.insuranceAmount) : '';
		openActionMenuId = null;
	}

	function closeActionMenu() {
		openActionMenuId = null;
		actionsMenuPosition = null;
	}

	function openActionMenu(id: string, event?: MouseEvent) {
		if (openActionMenuId === id) {
			closeActionMenu();
			return;
		}

		openActionMenuId = id;
		if (!event) {
			actionsMenuPosition = null;
			return;
		}

		const trigger = event.currentTarget as HTMLElement | null;
		const rect = trigger?.getBoundingClientRect();
		const menuWidth = 150;
		const menuHeight = 170;

		actionsMenuPosition = rect
			? {
					x: Math.max(12, rect.left - menuWidth + 20),
					y: Math.min(window.innerHeight - menuHeight - 16, rect.top + rect.height + 8)
				}
			: { x: event.clientX, y: event.clientY };
	}

	function handleDocumentClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		const clickedActionButton = target?.closest('[data-payroll-action-button]');
		const clickedActionMenu = target?.closest('[data-payroll-action-menu]');

		if (openActionMenuId && !clickedActionButton && !clickedActionMenu) {
			closeActionMenu();
		}
	}

	function downloadPayrollPdf(payroll: any) {
		const employee = payroll.employee ?? {};
		const employeeName = `${employee.firstname ?? ''} ${employee.lastname ?? ''}`.trim() || 'Employee';
		const employeeNumber = employee.employeeNumber ?? 'N/A';
		const payPeriod = `${new Date(payroll.payPeriodStart).toLocaleDateString()} - ${new Date(payroll.payPeriodEnd).toLocaleDateString()}`;
		const payType = payroll.paymentType ?? 'Monthly';
		const doc = new jsPDF({ unit: 'pt', format: 'a4' });
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const margin = 40;
		let y = 40;

		const addText = (text: string, x: number, lineY: number, options?: { fontSize?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }) => {
			doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
			doc.setFontSize(options?.fontSize ?? 10);
			doc.setTextColor(options?.color?.[0] ?? 0, options?.color?.[1] ?? 0, options?.color?.[2] ?? 0);
			doc.text(text, x, lineY, { align: options?.align ?? 'left' });
		};

		const addHeaderLine = (label: string, value: string, xLabel: number, xValue: number, lineY: number) => {
			addText(label, xLabel, lineY, { fontSize: 9, color: [107, 114, 128] });
			addText(value, xValue, lineY, { fontSize: 11, bold: true, color: [17, 24, 39] });
		};

		const logoImage = new Image();
		logoImage.src = shortLogo;
		const pdfLogo = logoImage.src.startsWith('data:') ? logoImage.src : shortLogo;
		try {
			doc.addImage(pdfLogo, 'PNG', margin, y, 42, 42);
		} catch (error) {
			console.error('Logo failed to load:', error);
		}
		addText('Payroll Statement', margin + 54, y + 19, { fontSize: 12, bold: true, color: [31, 41, 55] });
		addText('Payroll Report', pageWidth - margin, y + 12, { fontSize: 16, bold: true, align: 'right', color: [31, 41, 55] });
		addText(payPeriod, pageWidth - margin, y + 30, { fontSize: 9, align: 'right', color: [75, 85, 99] });
		y += 70;

		doc.setDrawColor(95, 197, 192);
		doc.setLineWidth(1.2);
		doc.line(margin, y, pageWidth - margin, y);
		y += 20;

		addHeaderLine('Employee', employeeName, margin, margin + 140, y);
		addHeaderLine('Employee No.', employeeNumber, margin, margin + 140, y + 18);
		addHeaderLine('Payment Type', payType, margin, margin + 140, y + 36);
		addHeaderLine('Salary Basis', payroll.salaryType ?? 'Gross', margin, margin + 140, y + 54);
		y += 90;

		doc.setFillColor(243, 244, 246);
		doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 4, 4, 'F');
		addText('Payroll Summary', margin + 10, y + 15, { fontSize: 11, bold: true, color: [17, 24, 39] });
		y += 30;

		const rows = [
			['Regular Pay', formatCurrency(payroll.regularPay ?? 0)],
			['Overtime Pay', formatCurrency(payroll.overtimePay ?? 0)],
			['Allowances', formatCurrency(payroll.allowances ?? 0)],
			['Bonuses', formatCurrency(payroll.bonuses ?? 0)],
			['Deductions', formatCurrency(payroll.deductions ?? 0)],
			['Tax', formatCurrency(payroll.taxAmount ?? 0)],
			['Pension', formatCurrency(payroll.pensionAmount ?? 0)],
			['Insurance', formatCurrency(payroll.insuranceAmount ?? 0)]
		];
		const colX = margin;
		const colWidth = pageWidth - margin * 2;
		const rowHeight = 18;
		const tableLeft = colX;
		const tableWidth = colWidth;
		const firstCol = tableWidth * 0.65;
		doc.setDrawColor(209, 213, 219);
		doc.setLineWidth(0.7);
		doc.rect(tableLeft, y, tableWidth, rows.length * rowHeight + 20);
		doc.line(tableLeft, y + 20, tableLeft + tableWidth, y + 20);
		for (let i = 0; i < rows.length; i += 1) {
			const rowY = y + 20 + i * rowHeight;
			doc.line(tableLeft, rowY, tableLeft + tableWidth, rowY);
			doc.line(tableLeft + firstCol, y + 20, tableLeft + firstCol, y + 20 + rows.length * rowHeight);
			addText(rows[i][0], tableLeft + 8, rowY + 12, { fontSize: 10, color: [31, 41, 55] });
			addText(rows[i][1], tableLeft + firstCol + 8, rowY + 12, { fontSize: 10, bold: true, color: [17, 24, 39] });
		}
		y += rows.length * rowHeight + 28;

		const totalsY = y;
		doc.setDrawColor(209, 213, 219);
		doc.rect(pageWidth - margin - 200, totalsY, 200, 44);
		addText('Gross Pay', pageWidth - margin - 190, totalsY + 15, { fontSize: 10, color: [55, 65, 81] });
		addText(formatCurrency(payroll.grossPay ?? 0), pageWidth - margin - 18, totalsY + 15, { fontSize: 10, bold: true, align: 'right', color: [17, 24, 39] });
		addText('Net Pay', pageWidth - margin - 190, totalsY + 31, { fontSize: 10, color: [55, 65, 81] });
		addText(formatCurrency(payroll.netPay ?? 0), pageWidth - margin - 18, totalsY + 31, { fontSize: 10, bold: true, align: 'right', color: [17, 24, 39] });
		y += 70;

		addText('Prepared on: ' + new Date().toLocaleDateString(), margin, y, { fontSize: 9, color: [75, 85, 99] });
		addText('Status: ' + (payroll.status ?? 'Calculated'), margin, y + 16, { fontSize: 9, color: [75, 85, 99] });
		addText('Approved by', pageWidth - margin - 110, y, { fontSize: 9, color: [75, 85, 99] });
		addText('Finance / HR', pageWidth - margin - 110, y + 16, { fontSize: 9, bold: true, color: [17, 24, 39] });

		doc.save(`payroll-${employeeName.replace(/\s+/g, '-').toLowerCase()}-${new Date(payroll.payPeriodStart).getFullYear()}.pdf`);
		openActionMenuId = null;
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

	function formatCurrency(value: string | number | bigint | null | undefined) {
		const amount = Number(toNumber(value, 0));
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'MWK',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(Number.isFinite(amount) ? amount : 0);
	}

	function formatHoursValue(value: unknown) {
		const hours = Number(toNumber(value, 0));
		return Number.isFinite(hours) ? `${hours.toFixed(2)}h` : '0.00h';
	}

	function formatMonthlySalaryValue(value: unknown) {
		const numericValue = Number(toNumber(value, 0));
		return `${new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'MWK',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(Number.isFinite(numericValue) ? numericValue : 0)} / month`;
	}

	function getSummary() {
		const totalNet = payrollRecords.reduce((sum, item) => sum + toNumber(item.netPay, 0), 0);
		const paid = payrollRecords.filter((item) => item.status === 'Paid').length;
		const pending = payrollRecords.filter((item) => item.status !== 'Paid').length;
		return { totalNet, paid, pending };
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
		loadPayroll();
		loadEmployees();

		return () => {
			document.removeEventListener('click', handleDocumentClick);
		};
	});
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6 gap-4 flex-wrap">
		<div>
			<p class="text-xs uppercase tracking-wide text-[#5fc5c0] font-semibold">Human resources</p>
			<h1 class="text-2xl font-bold text-gray-800">Payroll</h1>
		</div>
		<button
			onclick={openAddModal}
			class="bg-[#5fc5c0] text-white px-4 py-2 rounded-none text-sm font-medium hover:bg-[#4db5b0] transition-colors"
		>
			Create Payroll
		</button>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="bg-white border border-gray-200 rounded-none p-4">
			<p class="text-xs uppercase text-gray-500">Total net pay</p>
			<h2 class="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(getSummary().totalNet)}</h2>
		</div>
		<div class="bg-white border border-gray-200 rounded-none p-4">
			<p class="text-xs uppercase text-gray-500">Paid</p>
			<h2 class="text-2xl font-bold text-gray-800 mt-2">{getSummary().paid}</h2>
		</div>
		<div class="bg-white border border-gray-200 rounded-none p-4">
			<p class="text-xs uppercase text-gray-500">Pending</p>
			<h2 class="text-2xl font-bold text-gray-800 mt-2">{getSummary().pending}</h2>
		</div>
	</div>

	<div class="bg-white border border-gray-200 rounded-none p-4 mb-6">
		<div class="flex flex-col md:flex-row gap-3 md:items-center">
			<input
				type="text"
				placeholder="Search employee or employee number"
				bind:value={searchQuery}
				class="flex-1 px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] rounded-none"
			/>
			<select bind:value={statusFilter} class="px-3 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] rounded-none">
				<option value="All">All statuses</option>
				<option value="Draft">Draft</option>
				<option value="Calculated">Calculated</option>
				<option value="Approved">Approved</option>
				<option value="Paid">Paid</option>
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
		<p class="text-gray-500">Loading payroll records...</p>
	{:else if getFilteredPayrollRecords().length === 0}
		<div class="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
			No payroll records match this filter.
		</div>
	{:else}
		<div class="bg-white border border-gray-200 rounded-none overflow-visible relative z-0">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pay Period</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Regular</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Overtime</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Gross Pay</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Net Pay</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
						<th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each getFilteredPayrollRecords() as payroll}
						<tr class="border-t border-gray-200 hover:bg-gray-50">
							<td class="px-4 py-3 text-xs font-medium text-gray-800">
								<div class="font-semibold">{payroll.employee?.firstname} {payroll.employee?.lastname}</div>
								<div class="text-[10px] text-gray-500">{payroll.employee?.employeeNumber}</div>
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">
								{new Date(payroll.payPeriodStart).toLocaleDateString()} - {new Date(payroll.payPeriodEnd).toLocaleDateString()}
							</td>
							<td class="px-4 py-3 text-xs text-gray-600">{payroll.paymentType}</td>
							<td class="px-4 py-3 text-xs text-gray-600">{payroll.paymentType === 'Monthly' ? formatMonthlySalaryValue(payroll.regularPay ?? payroll.netPay ?? 0) : formatHoursValue(payroll.regularHours)}</td>
							<td class="px-4 py-3 text-xs text-gray-600">{payroll.paymentType === 'Monthly' ? '—' : formatHoursValue(payroll.overtimeHours)}</td>
							<td class="px-4 py-3 text-xs text-gray-600">{formatCurrency(payroll.grossPay)}</td>
							<td class="px-4 py-3 text-xs font-medium text-gray-800">{formatCurrency(payroll.netPay)}</td>
							<td class="px-4 py-3">
								<span class="text-xs px-2 py-1 rounded {getStatusColor(payroll.status)}">{payroll.status}</span>
							</td>
							<td class="px-4 py-3">
								<div class="relative flex justify-end">
									<button
										data-payroll-action-button
										onclick={(e) => {
											e.stopPropagation();
											openActionMenu(String(payroll.id), e);
										}}
										class="inline-flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-none"
										aria-label="Payroll actions"
									>
										<Icon icon="mdi:dots-vertical" class="w-4 h-4" />
									</button>

									{#if openActionMenuId === String(payroll.id) && actionsMenuPosition}
										<div data-payroll-action-menu class="fixed bg-white border border-gray-200 rounded-none shadow-lg z-[9999] min-w-[120px]" style="top: {actionsMenuPosition.y}px; left: {actionsMenuPosition.x}px;">
											<button
												onclick={(e) => {
													e.stopPropagation();
													downloadPayrollPdf(payroll);
													openActionMenuId = null;
													actionsMenuPosition = null;
												}}
												class="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 w-full text-left rounded-none"
											>
												<span>Download PDF</span>
											</button>
											<button
												onclick={(e) => {
													e.stopPropagation();
													openEditPayroll(payroll);
													openActionMenuId = null;
													actionsMenuPosition = null;
												}}
												class="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 w-full text-left rounded-none"
											>
												<span>Update</span>
											</button>
											<button
												onclick={(e) => {
													e.stopPropagation();
													deletePayroll(String(payroll.id));
												}}
												class="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left rounded-none"
											>
												<span>Delete</span>
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

{#if showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-start justify-start z-[1000] p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/50"
			aria-label="Close payroll editor"
			onclick={closeEditModal}
		></button>
		<div class="relative bg-white rounded-none p-6 w-full max-w-lg shadow-xl ml-0 md:ml-6">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-lg font-bold text-gray-800">Update Payroll</h2>
				<button onclick={closeEditModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="editPayrollEmployeeId" class="block text-xs font-medium text-gray-700 mb-1">Employee</label>
					<select
						id="editPayrollEmployeeId"
						bind:value={employeeId}
						class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
					>
						<option value="">Select Employee</option>
						{#each employees as employee}
							<option value={employee.id}>{employee.firstname} {employee.lastname} ({employee.employeeNumber})</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="editPayPeriodStart" class="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
						<input id="editPayPeriodStart" type="date" bind:value={payPeriodStart} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editPayPeriodEnd" class="block text-xs font-medium text-gray-700 mb-1">Period End</label>
						<input id="editPayPeriodEnd" type="date" bind:value={payPeriodEnd} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>

				{#if getSelectedEmployee()?.paymentType === 'Monthly'}
					<div class="bg-gray-50 border border-gray-200 p-3">
						<p class="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Monthly salary</p>
						<p class="text-sm font-semibold text-gray-800">{formatMonthlySalaryValue(getSelectedEmployee()?.monthlySalary ?? 0)}</p>
					</div>
				{/if}

				{#if getSelectedEmployee()?.paymentType !== 'Monthly'}
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="editRegularHours" class="block text-xs font-medium text-gray-700 mb-1">Regular Hours</label>
							<input id="editRegularHours" type="number" step="0.25" bind:value={regularHours} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						</div>
						<div>
							<label for="editOvertimeHours" class="block text-xs font-medium text-gray-700 mb-1">Overtime Hours</label>
							<input id="editOvertimeHours" type="number" step="0.25" bind:value={overtimeHours} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="editSalaryType" class="block text-xs font-medium text-gray-700 mb-1">Salary Type</label>
						<select id="editSalaryType" bind:value={salaryType} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Gross">Gross</option>
							<option value="Net">Net</option>
						</select>
					</div>
					<div>
						<label for="editTaxPercentage" class="block text-xs font-medium text-gray-700 mb-1">Tax % (optional)</label>
						<input id="editTaxPercentage" type="number" step="0.01" min="0" bind:value={taxPercentage} placeholder="0.00" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="editPension" class="block text-xs font-medium text-gray-700 mb-1">Pension (optional)</label>
						<input id="editPension" type="number" min="0" bind:value={pension} placeholder="0" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editInsurance" class="block text-xs font-medium text-gray-700 mb-1">Insurance (optional)</label>
						<input id="editInsurance" type="number" min="0" bind:value={insurance} placeholder="0" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="editAllowances" class="block text-xs font-medium text-gray-700 mb-1">Allowances</label>
						<input id="editAllowances" type="number" bind:value={allowances} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editDeductions" class="block text-xs font-medium text-gray-700 mb-1">Deductions</label>
						<input id="editDeductions" type="number" bind:value={deductions} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="editBonuses" class="block text-xs font-medium text-gray-700 mb-1">Bonuses</label>
						<input id="editBonuses" type="number" bind:value={bonuses} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button onclick={closeEditModal} class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-none">Cancel</button>
				<button onclick={updatePayroll} class="bg-[#5fc5c0] text-white px-4 py-2 text-sm font-medium hover:bg-[#4db5b0] rounded-none">Save Changes</button>
			</div>
		</div>
	</div>
{/if}

{#if showAddModal}
	<div class="fixed inset-0 bg-black/50 flex items-start justify-start z-[1000] p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/50"
			aria-label="Close payroll form"
			onclick={closeAddModal}
		></button>
		<div class="relative bg-white rounded-none p-6 w-full max-w-lg shadow-xl ml-0 md:ml-6">
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
						class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
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
							class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="payPeriodEnd" class="block text-xs font-medium text-gray-700 mb-1">Period End</label>
						<input
							id="payPeriodEnd"
							type="date"
							bind:value={payPeriodEnd}
							class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>

				{#if getSelectedEmployee()?.paymentType === 'Monthly'}
					<div class="bg-gray-50 border border-gray-200 p-3">
						<p class="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Monthly salary</p>
						<p class="text-sm font-semibold text-gray-800">{formatMonthlySalaryValue(getSelectedEmployee()?.monthlySalary ?? 0)}</p>
					</div>
				{/if}

				{#if getSelectedEmployee()?.paymentType !== 'Monthly'}
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="regularHours" class="block text-xs font-medium text-gray-700 mb-1">Regular Hours</label>
							<input
								id="regularHours"
								type="number"
								step="0.25"
								bind:value={regularHours}
								class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							/>
						</div>
						<div>
							<label for="overtimeHours" class="block text-xs font-medium text-gray-700 mb-1">Overtime Hours</label>
							<input
								id="overtimeHours"
								type="number"
								step="0.25"
								bind:value={overtimeHours}
								class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
							/>
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="salaryType" class="block text-xs font-medium text-gray-700 mb-1">Salary Type</label>
						<select id="salaryType" bind:value={salaryType} class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]">
							<option value="Gross">Gross</option>
							<option value="Net">Net</option>
						</select>
					</div>
					<div>
						<label for="taxPercentage" class="block text-xs font-medium text-gray-700 mb-1">Tax % (optional)</label>
						<input id="taxPercentage" type="number" step="0.01" min="0" bind:value={taxPercentage} placeholder="0.00" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="pension" class="block text-xs font-medium text-gray-700 mb-1">Pension (optional)</label>
						<input id="pension" type="number" min="0" bind:value={pension} placeholder="0" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
					<div>
						<label for="insurance" class="block text-xs font-medium text-gray-700 mb-1">Insurance (optional)</label>
						<input id="insurance" type="number" min="0" bind:value={insurance} placeholder="0" class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]" />
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="allowances" class="block text-xs font-medium text-gray-700 mb-1">Allowances</label>
						<input
							id="allowances"
							type="number"
							bind:value={allowances}
							class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="deductions" class="block text-xs font-medium text-gray-700 mb-1">Deductions</label>
						<input
							id="deductions"
							type="number"
							bind:value={deductions}
							class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
					<div>
						<label for="bonuses" class="block text-xs font-medium text-gray-700 mb-1">Bonuses</label>
						<input
							id="bonuses"
							type="number"
							bind:value={bonuses}
							class="w-full px-3 py-2 border border-gray-300 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-[#5fc5c0]"
						/>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={closeAddModal}
					class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-none"
				>
					Cancel
				</button>
				<button
					onclick={createPayroll}
					class="bg-[#5fc5c0] text-white px-4 py-2 text-sm font-medium hover:bg-[#4db5b0] rounded-none"
				>
					Save Payroll
				</button>
			</div>
		</div>
	</div>
{/if}
