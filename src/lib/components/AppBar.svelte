<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { can } from '$lib/permissions';

	let showDropdown = $state(false);
	let showLogoutDialog = $state(false);

	const user = $derived($page.data.user as any);
	const permissions = $derived(((user?.permissions ?? []) as string[]));
	const displayName = $derived(
		user ? `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || user.email : 'Guest'
	);
	const initials = $derived(
		user
			? `${(user.firstname ?? '?').charAt(0)}${(user.lastname ?? '').charAt(0)}`.toUpperCase()
			: '?'
	);

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
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/logout';
		document.body.appendChild(form);
		form.submit();
	}
</script>

<header class="fixed top-0 right-0 h-12 bg-white border-b border-gray-200 shadow-lg z-50" style="left: 16rem;">
	<div class="h-full flex items-center justify-end px-6">
		{#if can(permissions, 'view_admin')}
			<a href="/settings" class="p-2 hover:bg-gray-100 transition-colors" aria-label="Settings">
				<Icon icon="mdi:cog" class="w-4 h-4 text-gray-600" />
			</a>
			<div class="w-px h-8 bg-gray-300 mx-4"></div>
		{/if}

		<div class="relative">
			<button onclick={toggleDropdown} class="flex items-center gap-2 focus:outline-none">
				<div class="text-right">
					<p class="text-xs font-semibold text-gray-800">{displayName}</p>
					<p class="text-[10px] text-gray-500">{user?.roleName ?? 'Signed out'}</p>
				</div>
				<div class="w-8 h-8 bg-[#5fc5c0] rounded-full flex items-center justify-center text-[11px] font-semibold text-white">
					{initials}
				</div>
			</button>

			{#if showDropdown}
				<div class="absolute right-0 mt-2 w-52 bg-white border border-gray-200 shadow-lg">
					<div class="px-4 py-3 border-b border-gray-100">
						<p class="text-xs font-semibold text-gray-800">{displayName}</p>
						<p class="text-[10px] text-gray-500 truncate">{user?.email ?? ''}</p>
					</div>
					{#if can(permissions, 'view_admin')}
						<a
							href="/admin/profile"
							class="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
							onclick={closeDropdown}
						>
							<div class="flex items-center gap-2">
								<Icon icon="mdi:account" class="w-3 h-3" />
								Company profile
							</div>
						</a>
					{/if}
					<button
						type="button"
						onclick={handleLogoutClick}
						class="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-gray-100 transition-colors"
					>
						<div class="flex items-center gap-2">
							<Icon icon="mdi:logout" class="w-3 h-3" />
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
	onCancel={() => (showLogoutDialog = false)}
/>
