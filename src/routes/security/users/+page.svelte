<script lang="ts">
	import Icon from '@iconify/svelte';
	let { data } = $props();
	
	let showModal = $state(false);
	let firstname = $state('');
	let lastname = $state('');
	let email = $state('');
	let password = $state('');
	let roleId = $state('');
	let departmentId = $state('');
	let branchId = $state('');

	function openModal() {
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		firstname = '';
		lastname = '';
		email = '';
		password = '';
		roleId = '';
		departmentId = '';
		branchId = '';
	}

	async function handleAddUser() {
		try {
			const response = await fetch('/api/security/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					firstname, 
					lastname, 
					email, 
					password,
					roleId: roleId ? BigInt(roleId) : null,
					departmentId: departmentId ? BigInt(departmentId) : null,
					branchId: branchId ? BigInt(branchId) : null
				})
			});
			
			if (response.ok) {
				closeModal();
				window.location.reload();
			} else {
				const responseData = await response.json();
				alert(responseData.error || 'Failed to create user');
			}
		} catch (error) {
			console.error('Error adding user:', error);
			alert('Failed to create user');
		}
	}
</script>

<div class="p-6">
	<a href="/settings" class="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to Settings</span>
	</a>
	
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-sm font-bold text-gray-800">Users</h1>
		<button
			onclick={openModal}
			class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
		>
			<Icon icon="mdi:plus" class="w-4 h-4" />
			<span>Add User</span>
		</button>
	</div>

	{#if data.users}
		<div class="bg-white shadow">
			<div class="p-4">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Name</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Email</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Role</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Department</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as user}
							<tr class="border-b border-gray-100">
								<td class="py-2">
									<span class="text-xs text-gray-700">{user.firstname} {user.lastname}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{user.email}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{user.role?.name || '-'}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{user.department?.name || '-'}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-500">{user.status || '-'}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<p class="text-xs text-gray-500">No users found</p>
	{/if}
</div>

<!-- Add User Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Add New User</h2>
				<button onclick={closeModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="user-firstname" class="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
						<input
							id="user-firstname"
							type="text"
							bind:value={firstname}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Enter first name"
						/>
					</div>
					
					<div>
						<label for="user-lastname" class="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
						<input
							id="user-lastname"
							type="text"
							bind:value={lastname}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Enter last name"
						/>
					</div>
				</div>
				
				<div>
					<label for="user-email" class="block text-xs font-medium text-gray-700 mb-1">Email *</label>
					<input
						id="user-email"
						type="email"
						bind:value={email}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter email"
					/>
				</div>
				
				<div>
					<label for="user-password" class="block text-xs font-medium text-gray-700 mb-1">Password *</label>
					<input
						id="user-password"
						type="password"
						bind:value={password}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter password"
					/>
				</div>
				
				<div>
					<label for="user-role" class="block text-xs font-medium text-gray-700 mb-1">Role *</label>
					<select
						id="user-role"
						bind:value={roleId}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">Select a role</option>
						{#if data.roles && data.roles.length > 0}
							{#each data.roles as role}
								<option value={role.id.toString()}>{role.name}</option>
							{/each}
						{:else}
							<option value="" disabled>No roles available</option>
						{/if}
					</select>
				</div>
				
				<div>
					<label for="user-department" class="block text-xs font-medium text-gray-700 mb-1">Department</label>
					<select
						id="user-department"
						bind:value={departmentId}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">Select a department</option>
						{#if data.departments && data.departments.length > 0}
							{#each data.departments as department}
								<option value={department.id.toString()}>{department.name}</option>
							{/each}
						{:else}
							<option value="" disabled>No departments available</option>
						{/if}
					</select>
				</div>
				
				<div>
					<label for="user-branch" class="block text-xs font-medium text-gray-700 mb-1">Branch</label>
					<select
						id="user-branch"
						bind:value={branchId}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">Select a branch</option>
						{#if data.branches && data.branches.length > 0}
							{#each data.branches as branch}
								<option value={branch.id.toString()}>{branch.name}</option>
							{/each}
						{:else}
							<option value="" disabled>No branches available</option>
						{/if}
					</select>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleAddUser}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Add User
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

