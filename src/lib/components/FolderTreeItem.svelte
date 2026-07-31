<script lang="ts">
	import Icon from '@iconify/svelte';
	import FolderTreeItem from './FolderTreeItem.svelte';
	
	let { folder, selectedFolderId, selectFolder, level = 0, onFolderDelete, onFolderUpdate }: {
		folder: any;
		selectedFolderId: string | null;
		selectFolder: (id: string | null) => void;
		level?: number;
		onFolderDelete?: (folderId: string) => void;
		onFolderUpdate?: (folder: any) => void;
	} = $props();
	
	let showDropdown = $state(false);
	
	function toggleDropdown(event: Event) {
		event.stopPropagation();
		showDropdown = !showDropdown;
	}
	
	function handleDelete() {
		if (onFolderDelete && !folder.isCategory) {
			onFolderDelete(folder.id.toString());
		}
		showDropdown = false;
	}
	
	function handleUpdate() {
		if (onFolderUpdate && !folder.isCategory) {
			onFolderUpdate(folder);
		}
		showDropdown = false;
	}
</script>

<div class="ml-{level * 2}">
	<div class="flex items-center justify-between group">
		<button
			onclick={() => selectFolder(folder.id.toString())}
			class="flex items-center gap-2 flex-1 p-2 text-left hover:bg-gray-100 transition-colors {selectedFolderId === folder.id.toString() ? 'bg-[#e8f8f7] text-[#5fc5c0]' : 'text-gray-600'}"
		>
			<Icon icon={folder.icon || (folder.children?.length > 0 ? 'mdi:folder-open' : 'mdi:folder')} class="w-4 h-4" />
			<span class="text-xs">{folder.name}</span>
		</button>
		{#if !folder.isCategory}
			<div class="relative">
				<button
					onclick={toggleDropdown}
					class="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<Icon icon="mdi:dots-vertical" class="w-4 h-4" />
				</button>
				
				{#if showDropdown}
					<div class="absolute right-0 top-full mt-1 bg-white shadow-lg border border-gray-200 rounded-md py-1 z-50 min-w-[120px]">
						<button
							onclick={handleUpdate}
							class="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
						>
							<Icon icon="mdi:pencil" class="w-4 h-4" />
							Rename
						</button>
						<button
							onclick={handleDelete}
							class="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-gray-100 flex items-center gap-2"
						>
							<Icon icon="mdi:delete" class="w-4 h-4" />
							Delete
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
	{#if folder.children && folder.children.length > 0}
		{#each folder.children as child}
			<FolderTreeItem folder={child} {selectedFolderId} {selectFolder} level={level + 1} {onFolderDelete} {onFolderUpdate} />
		{/each}
	{/if}
</div>
