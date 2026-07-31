<script lang="ts">
	import { fade } from 'svelte/transition';
	
	let { message, type = 'success', duration = 3000, onClose }: {
		message: string;
		type?: 'success' | 'error' | 'info';
		duration?: number;
		onClose: () => void;
	} = $props();
	
	const bgColor = $derived(type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500');
	const icon = $derived(type === 'success' ? 'mdi:check-circle' : type === 'error' ? 'mdi:alert-circle' : 'mdi:information');
	
	$effect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, duration);
		return () => clearTimeout(timer);
	});
</script>

<div transition:fade class="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 {bgColor} text-white rounded-lg shadow-lg">
	<div class="flex items-center gap-2">
		<div class="w-5 h-5">
			<svg viewBox="0 0 24 24" fill="currentColor">
				{#if type === 'success'}
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
				{:else if type === 'error'}
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
				{:else}
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
				{/if}
			</svg>
		</div>
		<span class="text-sm font-medium">{message}</span>
	</div>
	<button onclick={onClose} class="text-white/80 hover:text-white" aria-label="Close toast">
		<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
			<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
		</svg>
	</button>
</div>
