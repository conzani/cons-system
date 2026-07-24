<script lang="ts">
	import { page } from '$app/stores';
	import { hasPermission } from '$lib/auth';

	interface Props {
		permission: string;
		fallback?: string;
		children: import('svelte').Snippet;
	}

	let { permission, fallback = 'Access denied', children }: Props = $props();
</script>

{#if hasPermission($page.data.user, permission)}
	{@render children()}
{:else}
	<p class="text-red-500">{fallback}</p>
{/if}
