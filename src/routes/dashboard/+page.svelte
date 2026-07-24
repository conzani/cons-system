<script lang="ts">
	let { data } = $props();
</script>

<div class="min-h-screen bg-gray-100">
	<nav class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex">
					<div class="flex-shrink-0 flex items-center">
						<h1 class="text-xl font-bold">Construction Management System</h1>
					</div>
				</div>
				<div class="flex items-center">
					<span class="mr-4">Welcome, {data.user?.firstname} {data.user?.lastname}</span>
					<a href="/logout" class="text-red-600 hover:text-red-800">Logout</a>
				</div>
			</div>
		</div>
	</nav>

	<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<div class="px-4 py-6 sm:px-0">
			<h2 class="text-2xl font-bold mb-6">Dashboard</h2>
			
			{#if data.user}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#if data.user.permissions.includes('view_dashboard')}
						<div class="bg-white p-6 rounded-lg shadow">
							<h3 class="text-lg font-semibold mb-2">My Tasks</h3>
							<p class="text-gray-600">View and manage your assigned tasks</p>
						</div>
					{/if}
					
					{#if data.user.permissions.includes('view_notifications')}
						<div class="bg-white p-6 rounded-lg shadow">
							<h3 class="text-lg font-semibold mb-2">Notifications</h3>
							<p class="text-gray-600">View system notifications</p>
						</div>
					{/if}
					
					{#if data.user.permissions.includes('view_tenders')}
						<div class="bg-white p-6 rounded-lg shadow">
							<h3 class="text-lg font-semibold mb-2">Tender Opportunities</h3>
							<p class="text-gray-600">Manage tender opportunities</p>
						</div>
					{/if}
					
					{#if data.user.permissions.includes('view_projects')}
						<div class="bg-white p-6 rounded-lg shadow">
							<h3 class="text-lg font-semibold mb-2">Projects</h3>
							<p class="text-gray-600">View and manage projects</p>
						</div>
					{/if}
					
					{#if data.user.permissions.includes('view_sites')}
						<div class="bg-white p-6 rounded-lg shadow">
							<h3 class="text-lg font-semibold mb-2">Sites</h3>
							<p class="text-gray-600">Manage construction sites</p>
						</div>
					{/if}
					
					{#if data.user.permissions.includes('view_procurement')}
						<div class="bg-white p-6 rounded-lg shadow">
							<h3 class="text-lg font-semibold mb-2">Procurement</h3>
							<p class="text-gray-600">Manage procurement activities</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
