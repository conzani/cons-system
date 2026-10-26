<script lang="ts">
	import { uploadEvidence } from '$lib/upload';
	import { toast } from '$lib/stores/toast';

	interface Props {
		documents?: any[];
		documentId?: string;
		label?: string;
		projectId?: string;
		siteId?: string;
	}

	let {
		documents = [],
		documentId = $bindable(''),
		label = 'Attachment',
		projectId = '',
		siteId = ''
	}: Props = $props();

	let uploading = $state(false);
	let uploadedTitle = $state('');

	async function handleFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		uploading = true;
		try {
			const uploaded = await uploadEvidence(file, {
				title: file.name,
				projectId: projectId || undefined,
				siteId: siteId || undefined
			});
			documentId = uploaded.id;
			uploadedTitle = uploaded.title;
			toast.success('File uploaded and attached');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Upload failed');
		} finally {
			uploading = false;
		}
	}
</script>

<div>
	<label class="block text-[10px] font-medium text-gray-700 mb-1">{label}</label>
	<input
		type="file"
		accept="image/*,application/pdf"
		onchange={handleFile}
		disabled={uploading}
		class="w-full mb-2 px-3 py-2 border border-gray-300 text-xs file:mr-3 file:px-2 file:py-1 file:border-0 file:bg-[#e8f8f7] file:text-[#114a4b] file:text-[11px]"
	/>
	{#if uploading}
		<p class="text-[10px] text-[#114a4b] mb-1">Uploading from computer…</p>
	{/if}
	<select bind:value={documentId} class="w-full px-3 py-2 border border-gray-300 text-xs">
		<option value="">No document</option>
		{#if documentId && !documents.some((document) => String(document.id) === String(documentId))}
			<option value={documentId}>{uploadedTitle || 'Uploaded file'}</option>
		{/if}
		{#each documents as document}
			<option value={String(document.id)}>{document.title}</option>
		{/each}
	</select>
	<p class="text-[9px] text-gray-400 mt-1">Upload a file from this computer, or select an existing document.</p>
</div>
