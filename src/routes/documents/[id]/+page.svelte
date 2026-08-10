<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let document = $state<any>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		await loadDocument();
	});

	async function loadDocument() {
		try {
			loading = true;
			const response = await fetch(`/api/documents/${$page.params.id}`);
			if (response.ok) {
				document = await response.json();
			} else {
				error = 'Document not found';
			}
		} catch (err) {
			error = 'Failed to load document';
		} finally {
			loading = false;
		}
	}

	function goBack() {
		goto('/hr/documents');
	}

	function downloadDocument() {
		window.location.href = `/api/documents/${$page.params.id}?download=true`;
	}
</script>

<div class="p-6">
	<div class="mb-6">
		<button
			onclick={goBack}
			class="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium mb-4"
		>
			<Icon icon="mdi:arrow-left" class="w-4 h-4" />
			Back to Documents
		</button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-gray-500">Loading document...</div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center py-12">
			<div class="text-red-500">{error}</div>
		</div>
	{:else if document}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex justify-between items-start mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-800 mb-2">{document.title}</h1>
					<div class="flex items-center gap-4 text-sm text-gray-600">
						<span>File: {document.fileName}</span>
						<span>Size: {Number(document.fileSize) / 1024} KB</span>
						<span>Type: {document.mimeType}</span>
					</div>
				</div>
				<button
					onclick={downloadDocument}
					class="bg-[#5fc5c0] text-white py-2 px-4 text-sm font-medium hover:bg-[#4db5b0] flex items-center gap-2"
				>
					<Icon icon="mdi:download" class="w-4 h-4" />
					Download
				</button>
			</div>

			{#if document.description}
				<div class="mb-6">
					<h2 class="text-sm font-semibold text-gray-700 mb-2">Description</h2>
					<p class="text-sm text-gray-600">{document.description}</p>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-4 mb-6">
				<div>
					<h2 class="text-sm font-semibold text-gray-700 mb-2">Document Type</h2>
					<p class="text-sm text-gray-600">{document.documentType?.name || 'N/A'}</p>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-700 mb-2">Status</h2>
					<span class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">{document.status}</span>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-700 mb-2">Owner</h2>
					<p class="text-sm text-gray-600">{document.owner?.firstname} {document.owner?.lastname}</p>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-700 mb-2">Created Date</h2>
					<p class="text-sm text-gray-600">{new Date(document.createdAt).toLocaleDateString()}</p>
				</div>
			</div>

			{#if document.mimeType?.startsWith('image/')}
				<div class="border-t border-gray-200 pt-6">
					<h2 class="text-sm font-semibold text-gray-700 mb-4">Preview</h2>
					<img
						src={`/api/documents/${document.publicId}?view=true`}
						alt={document.title}
						class="max-w-full h-auto border border-gray-200 rounded"
					/>
				</div>
			{:else if document.mimeType === 'application/pdf'}
				<div class="border-t border-gray-200 pt-6">
					<h2 class="text-sm font-semibold text-gray-700 mb-4">Preview</h2>
					<iframe
						src={`/api/documents/${document.publicId}?view=true`}
						class="w-full h-96 border border-gray-200 rounded"
						title={document.title}
					></iframe>
				</div>
			{:else}
				<div class="border-t border-gray-200 pt-6">
					<h2 class="text-sm font-semibold text-gray-700 mb-4">Preview</h2>
					<div class="bg-gray-50 p-8 rounded text-center text-gray-500">
						<Icon icon="mdi:file" class="w-12 h-12 mx-auto mb-2" />
						<p>Preview not available for this file type</p>
						<p class="text-sm mb-4">Please download the file to view it</p>
						<button
							onclick={() => window.open(`/api/documents/${document.publicId}?view=true`, '_blank')}
							class="bg-[#5fc5c0] text-white py-2 px-4 text-sm font-medium hover:bg-[#4db5b0] inline-flex items-center gap-2"
						>
							<Icon icon="mdi:open-in-new" class="w-4 h-4" />
							Open in New Tab
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
