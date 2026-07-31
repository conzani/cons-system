<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import AppBar from '$lib/components/AppBar.svelte';
	import { page } from '$app/stores';
	import { toast } from '$lib/stores/toast';
	import Toast from '$lib/components/Toast.svelte';

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

{#each $toast as t (t.id)}
	<Toast 
		message={t.message} 
		type={t.type} 
		duration={t.duration} 
		onClose={() => toast.remove(t.id)} 
	/>
{/each}
