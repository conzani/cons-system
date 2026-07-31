<script lang="ts">
	let { 
		isOpen = false, 
		title = 'Confirm Action', 
		message = 'Are you sure you want to proceed?', 
		onConfirm, 
		onCancel 
	}: {
		isOpen?: boolean;
		title?: string;
		message?: string;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl rounded-lg">
			<div class="mb-4">
				<h3 class="text-lg font-semibold text-gray-800">{title}</h3>
				<p class="text-sm text-gray-600 mt-2">{message}</p>
			</div>
			
			<div class="flex justify-end gap-3">
				<button
					onclick={onCancel}
					class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors rounded-md"
				>
					Cancel
				</button>
				<button
					onclick={onConfirm}
					class="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 transition-colors rounded-md"
				>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
