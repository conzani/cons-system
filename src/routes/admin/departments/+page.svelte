<script lang="ts">
	import Icon from '@iconify/svelte';
	let { data } = $props();
	
	let showModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteDialog = $state(false);
	let editingDepartment = $state<any>(null);
	let deletingDepartment = $state<any>(null);
	let name = $state('');
	let type = $state('');
	let branchId = $state('');

	function openModal() {
		showModal = true;
	}

	function openEditModal(department: any) {
		editingDepartment = department;
		name = department.name;
		type = department.type || '';
		branchId = department.branchId?.toString() || '';
		showEditModal = true;
	}

	function openDeleteDialog(department: any) {
		deletingDepartment = department;
		showDeleteDialog = true;
	}

	function closeModal() {
		showModal = false;
		name = '';
		type = '';
		branchId = '';
	}

	function closeEditModal() {
		showEditModal = false;
		editingDepartment = null;
		name = '';
		type = '';
		branchId = '';
	}

	function closeDeleteDialog() {
		showDeleteDialog = false;
		deletingDepartment = null;
	}

	async function handleAddDepartment() {
		try {
			const response = await fetch('/api/admin/departments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, type, branchId: branchId ? BigInt(branchId) : null })
			});
			if (response.ok) {
				closeModal();
				window.location.reload();
			}
		} catch (error) {
			console.error('Error adding department:', error);
		}
	}

	async function handleUpdateDepartment() {
		try {
			const response = await fetch(`/api/admin/departments/${editingDepartment.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, type, branchId: branchId ? BigInt(branchId) : null })
			});
			if (response.ok) {
				closeEditModal();
				window.location.reload();
			}
		} catch (error) {
			console.error('Error updating department:', error);
		}
	}

	async function handleDeleteDepartment() {
		try {
			const response = await fetch(`/api/admin/departments/${deletingDepartment.id}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				closeDeleteDialog();
				window.location.reload();
			}
		} catch (error) {
			console.error('Error deleting department:', error);
		}
	}
</script>

<div class="p-6">
	<a href="/settings" class="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to Settings</span>
	</a>
	
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-sm font-bold text-gray-800">Departments</h1>
		<button
			onclick={openModal}
			class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
		>
			<Icon icon="mdi:plus" class="w-4 h-4" />
			<span>Add Department</span>
		</button>
	</div>

	{#if data.departments}
		<div class="bg-white shadow">
			<div class="p-4">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Name</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Type</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Branch</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Created</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.departments as department}
							<tr class="border-b border-gray-100">
								<td class="py-2">
									<span class="text-xs text-gray-700">{department.name}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{department.type || '-'}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{department.branch?.name || '-'}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-500">
										{new Date(department.createdAt).toLocaleDateString()}
									</span>
								</td>
								<td class="py-2">
									<div class="flex items-center gap-2">
										<button
											onclick={() => openEditModal(department)}
											class="p-1 hover:bg-gray-100 transition-colors"
											title="Edit"
										>
											<Icon icon="mdi:pencil" class="w-4 h-4 text-gray-600" />
										</button>
										<button
											onclick={() => openDeleteDialog(department)}
											class="p-1 hover:bg-gray-100 transition-colors"
											title="Delete"
										>
											<Icon icon="mdi:delete" class="w-4 h-4 text-red-600" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<p class="text-xs text-gray-500">No departments found</p>
	{/if}
</div>

<!-- Add Department Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Add New Department</h2>
				<button onclick={closeModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="dept-name" class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
					<input
						id="dept-name"
						type="text"
						bind:value={name}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter department name"
					/>
				</div>
				
				<div>
					<label for="dept-type" class="block text-xs font-medium text-gray-700 mb-1">Type</label>
					<input
						id="dept-type"
						type="text"
						bind:value={type}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter department type"
					/>
				</div>
				
				<div>
					<label for="dept-branch" class="block text-xs font-medium text-gray-700 mb-1">Branch ID</label>
					<input
						id="dept-branch"
						type="text"
						bind:value={branchId}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter branch ID"
					/>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleAddDepartment}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Add Department
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Department Modal -->
{#if showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Edit Department</h2>
				<button onclick={closeEditModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="edit-dept-name" class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
					<input
						id="edit-dept-name"
						type="text"
						bind:value={name}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter department name"
					/>
				</div>
				
				<div>
					<label for="edit-dept-type" class="block text-xs font-medium text-gray-700 mb-1">Type</label>
					<input
						id="edit-dept-type"
						type="text"
						bind:value={type}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter department type"
					/>
				</div>
				
				<div>
					<label for="edit-dept-branch" class="block text-xs font-medium text-gray-700 mb-1">Branch ID</label>
					<input
						id="edit-dept-branch"
						type="text"
						bind:value={branchId}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter branch ID"
					/>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeEditModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleUpdateDepartment}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Update Department
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center gap-3 mb-4">
				<Icon icon="mdi:alert-circle" class="w-6 h-6 text-red-600" />
				<h2 class="text-sm font-bold text-gray-800">Delete Department</h2>
			</div>
			
			<p class="text-xs text-gray-600 mb-6">
				Are you sure you want to delete "{deletingDepartment?.name}"? This action cannot be undone.
			</p>
			
			<div class="flex justify-end gap-3">
				<button
					onclick={closeDeleteDialog}
					class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleDeleteDepartment}
					class="px-4 py-2 bg-red-600 text-white text-xs hover:bg-red-700 transition-colors"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

