<script lang="ts">
	import Icon from '@iconify/svelte';
	let { data } = $props();
</script>

<div class="p-6">
	<a href="/settings" class="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to Settings</span>
	</a>
	<h1 class="text-sm font-bold text-gray-800 mb-6">Roles</h1>

	{#if data.roles}
		<div class="bg-white shadow">
			<div class="p-4">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Name</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Permissions</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Created</th>
						</tr>
					</thead>
					<tbody>
						{#each data.roles as role}
							<tr class="border-b border-gray-100">
								<td class="py-2">
									<span class="text-xs text-gray-700">{role.name}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">
										{role.rolesPermissions.length} permissions
									</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-500">
										{new Date(role.createdAt).toLocaleDateString()}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<p class="text-xs text-gray-500">No roles found</p>
	{/if}
</div>
