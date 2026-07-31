<script lang="ts">
	import Icon from '@iconify/svelte';
	let { data } = $props();
	
	let showModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteDialog = $state(false);
	let editingBranch = $state<any>(null);
	let deletingBranch = $state<any>(null);
	let name = $state('');
	let description = $state('');
	let location = $state('');

	function openModal() {
		showModal = true;
	}

	function openEditModal(branch: any) {
		editingBranch = branch;
		name = branch.name;
		description = branch.description || '';
		location = branch.location || '';
		showEditModal = true;
	}

	function openDeleteDialog(branch: any) {
		deletingBranch = branch;
		showDeleteDialog = true;
	}

	function closeModal() {
		showModal = false;
		name = '';
		description = '';
		location = '';
	}

	function closeEditModal() {
		showEditModal = false;
		editingBranch = null;
		name = '';
		description = '';
		location = '';
	}

	function closeDeleteDialog() {
		showDeleteDialog = false;
		deletingBranch = null;
	}

	async function handleAddBranch() {
		try {
			const response = await fetch('/api/admin/branches', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description, location })
			});
			if (response.ok) {
				closeModal();
				window.location.reload();
			}
		} catch (error) {
			console.error('Error adding branch:', error);
		}
	}

	async function handleUpdateBranch() {
		try {
			const response = await fetch(`/api/admin/branches/${editingBranch.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description, location })
			});
			if (response.ok) {
				closeEditModal();
				window.location.reload();
			}
		} catch (error) {
			console.error('Error updating branch:', error);
		}
	}

	async function handleDeleteBranch() {
		try {
			const response = await fetch(`/api/admin/branches/${deletingBranch.id}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				closeDeleteDialog();
				window.location.reload();
			}
		} catch (error) {
			console.error('Error deleting branch:', error);
		}
	}
</script>

<div class="p-6">
	<a href="/settings" class="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to Settings</span>
	</a>
	
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-sm font-bold text-gray-800">Branches</h1>
		<button
			onclick={openModal}
			class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
		>
			<Icon icon="mdi:plus" class="w-4 h-4" />
			<span>Add Branch</span>
		</button>
	</div>

	{#if data.branches}
		<div class="bg-white shadow">
			<div class="p-4">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Name</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Description</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Location</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Created</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.branches as branch}
							<tr class="border-b border-gray-100">
								<td class="py-2">
									<span class="text-xs text-gray-700">{branch.name}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{branch.description || '-'}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{branch.location || '-'}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-500">
										{new Date(branch.createdAt).toLocaleDateString()}
									</span>
								</td>
								<td class="py-2">
									<div class="flex items-center gap-2">
										<button
											onclick={() => openEditModal(branch)}
											class="p-1 hover:bg-gray-100 transition-colors"
											title="Edit"
										>
											<Icon icon="mdi:pencil" class="w-4 h-4 text-gray-600" />
										</button>
										<button
											onclick={() => openDeleteDialog(branch)}
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
		<p class="text-xs text-gray-500">No branches found</p>
	{/if}
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Add New Branch</h2>
				<button onclick={closeModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="branch-name" class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
					<input
						id="branch-name"
						type="text"
						bind:value={name}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter branch name"
					/>
				</div>
				
				<div>
					<label for="branch-description" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="branch-description"
						bind:value={description}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter description"
						rows="3"
					></textarea>
				</div>
				
				<div>
					<label for="branch-location" class="block text-xs font-medium text-gray-700 mb-1">Location</label>
					<input
						id="branch-location"
						type="text"
						bind:value={location}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter location"
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
						onclick={handleAddBranch}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Add Branch
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Branch Modal -->
{#if showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Edit Branch</h2>
				<button onclick={closeEditModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="edit-branch-name" class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
					<input
						id="edit-branch-name"
						type="text"
						bind:value={name}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter branch name"
					/>
				</div>
				
				<div>
					<label for="edit-branch-description" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="edit-branch-description"
						bind:value={description}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter description"
						rows="3"
					></textarea>
				</div>
				
				<div>
					<label for="edit-branch-location" class="block text-xs font-medium text-gray-700 mb-1">Location</label>
					<input
						id="edit-branch-location"
						type="text"
						bind:value={location}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter location"
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
						onclick={handleUpdateBranch}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Update Branch
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
				<h2 class="text-sm font-bold text-gray-800">Delete Branch</h2>
			</div>
			
			<p class="text-xs text-gray-600 mb-6">
				Are you sure you want to delete "{deletingBranch?.name}"? This action cannot be undone.
			</p>
			
			<div class="flex justify-end gap-3">
				<button
					onclick={closeDeleteDialog}
					class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleDeleteBranch}
					class="px-4 py-2 bg-red-600 text-white text-xs hover:bg-red-700 transition-colors"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
