<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import AppBar from '$lib/components/AppBar.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $page.url.pathname === '/login'}
	{@render children()}
{:else}
	<div class="flex">
		<Sidebar />
		<main class="ml-80 flex-1 min-h-screen">
			<AppBar />
			<div class="pt-16">
				{@render children()}
			</div>
		</main>
	</div>
{/if}
