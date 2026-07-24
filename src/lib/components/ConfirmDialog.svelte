<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		open?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		open = false,
		title = 'Are you sure?',
		message = 'This action cannot be undone.',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		onConfirm = () => {},
		onCancel = () => {}
	}: Props = $props();
</script>

{#if open}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-start gap-4 mb-4">
				
				<div>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
					<p class="text-gray-600">{message}</p>
				</div>
			</div>
			
			<div class="flex justify-end gap-3 mt-6">
				<button
					onclick={onCancel}
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
				>
					{cancelText}
				</button>
				<button
					onclick={onConfirm}
					class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
