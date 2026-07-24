<script lang="ts">
	import Icon from '@iconify/svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';

	let showDropdown = $state(false);
	let showLogoutDialog = $state(false);

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	function closeDropdown() {
		showDropdown = false;
	}

	function handleLogoutClick() {
		closeDropdown();
		showLogoutDialog = true;
	}

	function confirmLogout() {
		showLogoutDialog = false;
		// Submit logout form
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/logout';
		document.body.appendChild(form);
		form.submit();
	}

	function cancelLogout() {
		showLogoutDialog = false;
	}
</script>

<header class="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50" style="left: 20rem;">
	<div class="h-full flex items-center justify-end px-6">
		<!-- Settings Icon -->
		<a href="/settings" class="p-2 hover:bg-gray-100 transition-colors">
			<Icon icon="mdi:cog" class="w-6 h-6 text-gray-600" />
		</a>
		
		<!-- Divider -->
		<div class="w-px h-8 bg-gray-300 mx-4"></div>
		
		<!-- Profile -->
		<div class="relative">
			<button
				onclick={toggleDropdown}
				class="flex items-center gap-3 focus:outline-none"
			>
				<div class="text-right">
					<p class="text-sm font-semibold text-gray-800">John Doe</p>
					<p class="text-xs text-gray-500">Administrator</p>
				</div>
				<div class="w-10 h-10 bg-blue-600 flex items-center justify-center">
					<Icon icon="mdi:account" class="w-6 h-6 text-white" />
				</div>
			</button>
			
			{#if showDropdown}
				<div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg">
					<a
						href="/profile"
						class="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
						onclick={closeDropdown}
					>
						<div class="flex items-center gap-2">
							<Icon icon="mdi:account" class="w-4 h-4" />
							Profile
						</div>
					</a>
					<button
						onclick={handleLogoutClick}
						class="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100 transition-colors"
					>
						<div class="flex items-center gap-2">
							<Icon icon="mdi:logout" class="w-4 h-4" />
							Logout
						</div>
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>

<ConfirmDialog
	open={showLogoutDialog}
	title="Are you sure you want to logout?"
	message="You will be redirected to the login page."
	confirmText="Logout"
	cancelText="Cancel"
	onConfirm={confirmLogout}
	onCancel={cancelLogout}
/>
