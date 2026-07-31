<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import AppBar from '$lib/components/AppBar.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

{#if $page.url.pathname === '/login'}
	{@render children()}
{:else}
	<div class="flex">
		<Sidebar />
		<main class="ml-64 flex-1 min-h-screen">
			<AppBar />
			<div class="pt-12">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
