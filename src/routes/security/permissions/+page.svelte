<script lang="ts">
	import Icon from '@iconify/svelte';
	let { data } = $props();
</script>

<div class="p-6">
	<a href="/settings" class="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to Settings</span>
	</a>
	<h1 class="text-sm font-bold text-gray-800 mb-6">Permissions</h1>

	{#if data.permissions}
		<div class="bg-white shadow">
			<div class="p-4">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Name</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Action</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Module</th>
							<th class="text-left text-xs font-semibold text-gray-600 pb-2">Roles</th>
						</tr>
					</thead>
					<tbody>
						{#each data.permissions as permission}
							<tr class="border-b border-gray-100">
								<td class="py-2">
									<span class="text-xs text-gray-700">{permission.name}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{permission.action}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-600">{permission.module}</span>
								</td>
								<td class="py-2">
									<span class="text-xs text-gray-500">
										{permission.rolesPermissions.length} roles
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<p class="text-xs text-gray-500">No permissions found</p>
	{/if}
</div>
