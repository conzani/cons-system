<script lang="ts">
	import Icon from '@iconify/svelte';
	import FolderTreeItem from '$lib/components/FolderTreeItem.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';
	import { toast } from '$lib/stores/toast';
	let { data }: { data: { folders: any[], documents: any[], documentTypes: any[] } } = $props();
	
	// Initialize state from URL parameters
	let selectedFolderId = $state($page.url.searchParams.get('folder') || null);
	let selectedTab = $state($page.url.searchParams.get('tab') || 'all');
	let showUploadModal = $state(false);
	let showNewFolderModal = $state(false);
	let showEditFolderModal = $state(false);
	let showConfirmModal = $state(false);
	let confirmModalTitle = $state('');
	let confirmModalMessage = $state('');
	let pendingDeleteAction = $state<(() => void) | null>(null);
	let newFolderName = $state('');
	let newFolderDescription = $state('');
	let editingFolder = $state<any>(null);
	let uploadFile = $state<FileList | null>(null);
	let uploadTitle = $state('');
	let uploadDescription = $state('');
	let uploadDocumentTypeId = $state('');
	let uploadStatus = $state('Draft');
	let isUploading = $state(false);
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let filterDocumentTypeId = $state($page.url.searchParams.get('type') || '');
	let filterStatus = $state($page.url.searchParams.get('status') || '');
	let filterDateFrom = $state($page.url.searchParams.get('dateFrom') || '');
	let filterDateTo = $state($page.url.searchParams.get('dateTo') || '');
	let activeDropdownId = $state<string | null>(null);
	let showPreviewModal = $state(false);
	let previewDocument = $state<any>(null);
	let isUpdatingStatus = $state(false);

	// Update URL when state changes
	$effect(() => {
		const url = new URL(window.location.href);
		if (selectedFolderId) {
			url.searchParams.set('folder', selectedFolderId);
		} else {
			url.searchParams.delete('folder');
		}
		if (selectedTab !== 'all') {
			url.searchParams.set('tab', selectedTab);
		} else {
			url.searchParams.delete('tab');
		}
		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}
		if (filterDocumentTypeId) {
			url.searchParams.set('type', filterDocumentTypeId);
		} else {
			url.searchParams.delete('type');
		}
		if (filterStatus) {
			url.searchParams.set('status', filterStatus);
		} else {
			url.searchParams.delete('status');
		}
		if (filterDateFrom) {
			url.searchParams.set('dateFrom', filterDateFrom);
		} else {
			url.searchParams.delete('dateFrom');
		}
		if (filterDateTo) {
			url.searchParams.set('dateTo', filterDateTo);
		} else {
			url.searchParams.delete('dateTo');
		}
		window.history.replaceState({}, '', url.toString());
	});

	const tabs = [
		{ id: 'all', label: 'All Documents', icon: 'mdi:folder-multiple' },
		{ id: 'projects', label: 'Project Documents', icon: 'mdi:folder-multiple' },
		{ id: 'contracts', label: 'Contracts', icon: 'mdi:file-sign' },
		{ id: 'drawings', label: 'Drawings', icon: 'mdi:file-cad' },
		{ id: 'rfi', label: 'RFIs', icon: 'mdi:help' },
		{ id: 'technical', label: 'Technical Documents', icon: 'mdi:file-document' },
		{ id: 'photos', label: 'Photos', icon: 'mdi:image' },
		{ id: 'videos', label: 'Videos', icon: 'mdi:video' },
		{ id: 'templates', label: 'Templates', icon: 'mdi:file-cog' },
		{ id: 'versions', label: 'Version History', icon: 'mdi:history' },
		{ id: 'archive', label: 'Archive', icon: 'mdi:archive' }
	];

	function toggleDropdown(documentId: string) {
		activeDropdownId = activeDropdownId === documentId ? null : documentId;
	}

	function openPreview(document: any) {
		previewDocument = document;
		showPreviewModal = true;
		activeDropdownId = null;
	}

	function closePreviewModal() {
		showPreviewModal = false;
		previewDocument = null;
	}

	async function updateDocumentStatus(documentId: string, newStatus: string) {
		isUpdatingStatus = true;
		try {
			const response = await fetch(`/api/documents/${documentId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			if (response.ok) {
				const updatedDoc = await response.json();
				previewDocument = { ...previewDocument, status: newStatus };
				// Update the document in the local data
				const docIndex = data.documents.findIndex((d: any) => d.id === documentId);
				if (docIndex !== -1) {
					data.documents[docIndex] = { ...data.documents[docIndex], status: newStatus };
				}
				toast.success('Status updated successfully');
				window.location.reload();
			} else {
				const errorData = await response.json();
				toast.error(errorData.error || 'Failed to update status');
			}
		} catch (error) {
			console.error('Error updating status:', error);
			toast.error('Failed to update status');
		} finally {
			isUpdatingStatus = false;
		}
	}

	async function downloadDocument(documentId: string) {
		try {
			const response = await fetch(`/api/documents/${documentId}?download=true`);
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download';
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			} else {
				const errorData = await response.json();
				toast.error(errorData.error || 'Failed to download document');
			}
		} catch (error) {
			console.error('Error downloading document:', error);
			toast.error('Failed to download document');
		}
		activeDropdownId = null;
	}

	async function deleteDocument(documentId: string) {
		confirmModalTitle = 'Delete Document';
		confirmModalMessage = 'Are you sure you want to delete this document?';
		pendingDeleteAction = async () => {
			try {
				const response = await fetch(`/api/documents/${documentId}`, {
					method: 'DELETE'
				});
				if (response.ok) {
					toast.success('Document deleted successfully');
					window.location.reload();
				} else {
					toast.error('Failed to delete document');
				}
			} catch (error) {
				console.error('Error deleting document:', error);
				toast.error('Failed to delete document');
			}
			activeDropdownId = null;
		};
		showConfirmModal = true;
	}

	function selectFolder(folderId: string | null) {
		selectedFolderId = folderId;
		// If it's a category folder, update selectedTab
		if (folderId) {
			const category = categoryFolders.find(f => f.id === folderId);
			if (category) {
				selectedTab = category.id;
			}
		} else {
			selectedTab = 'all';
		}
	}

	function openUploadModal() {
		showUploadModal = true;
	}

	function closeUploadModal() {
		showUploadModal = false;
		uploadFile = null;
		uploadTitle = '';
		uploadDescription = '';
		uploadDocumentTypeId = '';
		uploadStatus = 'Draft';
		isUploading = false;
	}

	function openNewFolderModal() {
		showNewFolderModal = true;
		newFolderName = '';
		newFolderDescription = '';
	}

	function closeNewFolderModal() {
		showNewFolderModal = false;
		newFolderName = '';
		newFolderDescription = '';
	}

	async function createFolder() {
		if (!newFolderName) return;
		
		try {
			const response = await fetch('/api/documents/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newFolderName,
					description: newFolderDescription,
					parentFolderId: selectedFolderId,
					createdBy: 1 // TODO: Get actual user ID
				})
			});
			
			if (response.ok) {
				closeNewFolderModal();
				toast.success('Folder created successfully');
				window.location.reload();
			} else {
				toast.error('Failed to create folder');
			}
		} catch (error) {
			console.error('Error creating folder:', error);
			toast.error('Failed to create folder');
		}
	}

	function openEditFolderModal(folder: any) {
		editingFolder = folder;
		newFolderName = folder.name;
		newFolderDescription = folder.description || '';
		showEditFolderModal = true;
	}

	function closeEditFolderModal() {
		showEditFolderModal = false;
		editingFolder = null;
		newFolderName = '';
		newFolderDescription = '';
	}

	async function updateFolder() {
		if (!editingFolder || !newFolderName) return;
		
		try {
			const response = await fetch(`/api/documents/folders/${editingFolder.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newFolderName,
					description: newFolderDescription
				})
			});
			
			if (response.ok) {
				closeEditFolderModal();
				toast.success('Folder updated successfully');
				window.location.reload();
			} else {
				toast.error('Failed to update folder');
			}
		} catch (error) {
			console.error('Error updating folder:', error);
			toast.error('Failed to update folder');
		}
	}

	async function deleteFolder(folderId: string) {
		confirmModalTitle = 'Delete Folder';
		confirmModalMessage = 'Are you sure you want to delete this folder?';
		pendingDeleteAction = async () => {
			try {
				const response = await fetch(`/api/documents/folders/${folderId}`, {
					method: 'DELETE'
				});
				if (response.ok) {
					toast.success('Folder deleted successfully');
					window.location.reload();
				} else {
					toast.error('Failed to delete folder');
				}
			} catch (error) {
				console.error('Error deleting folder:', error);
				toast.error('Failed to delete folder');
			}
		};
		showConfirmModal = true;
	}

	function handleConfirm() {
		if (pendingDeleteAction) {
			pendingDeleteAction();
		}
		showConfirmModal = false;
		pendingDeleteAction = null;
	}

	function handleCancelConfirm() {
		showConfirmModal = false;
		pendingDeleteAction = null;
	}

	async function handleUpload() {
		if (!uploadFile || !uploadFile.length || !uploadTitle) {
			toast.error('Please select a file and enter a title');
			return;
		}

		isUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', uploadFile[0]);
			formData.append('title', uploadTitle);
			formData.append('description', uploadDescription);
			formData.append('status', uploadStatus);
			if (uploadDocumentTypeId) formData.append('documentTypeId', uploadDocumentTypeId);
			// Only send folderId if it's a numeric ID (not a category folder ID)
			if (selectedFolderId && !isNaN(Number(selectedFolderId))) formData.append('folderId', selectedFolderId);
			formData.append('ownerId', '1'); // TODO: Get actual user ID

			const response = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				closeUploadModal();
				toast.success('Document uploaded successfully');
				window.location.reload();
			} else {
				const errorData = await response.json();
				toast.error(errorData.error || 'Failed to upload document');
			}
		} catch (error) {
			console.error('Error uploading document:', error);
			toast.error('Failed to upload document');
		} finally {
			isUploading = false;
		}
	}

	function buildFolderTree(folders: any[], parentId: string | null = null): any[] {
		return folders
			.filter(folder => {
				const folderParentId = folder.parentFolderId ? folder.parentFolderId.toString() : null;
				return folderParentId === parentId;
			})
			.map(folder => ({
				...folder,
				children: buildFolderTree(folders, folder.id.toString())
			}));
	}

	const folderTree = $derived(buildFolderTree(data.folders));
	const categoryFolders = $derived(tabs.map(tab => ({
		id: tab.id,
		name: tab.label,
		icon: tab.icon,
		isCategory: true,
		children: []
	})));
	const combinedFolders = $derived([...categoryFolders, ...folderTree]);
	const currentFolder = $derived(data.folders.find(f => f.id.toString() === selectedFolderId));
	const currentCategory = $derived(categoryFolders.find(f => f.id === selectedFolderId));
	const filteredDocuments = $derived(data.documents.filter((d: any) => {
		const docFolderId = d.folderId ? d.folderId.toString() : null;
		
		// If it's a category folder, don't filter by folder ID
		const isCategorySelection = categoryFolders.some(f => f.id === selectedFolderId);
		const matchesFolder = isCategorySelection ? true : docFolderId === selectedFolderId;
		
		const matchesSearch = !searchQuery || 
			d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			d.fileName.toLowerCase().includes(searchQuery.toLowerCase());
		
		const matchesType = !filterDocumentTypeId || 
			d.documentTypeId?.toString() === filterDocumentTypeId;
		
		const matchesStatus = !filterStatus || d.status === filterStatus;
		
		let matchesDateRange = true;
		if (filterDateFrom) {
			matchesDateRange = matchesDateRange && new Date(d.createdAt) >= new Date(filterDateFrom);
		}
		if (filterDateTo) {
			matchesDateRange = matchesDateRange && new Date(d.createdAt) <= new Date(filterDateTo);
		}
		
		// Tab-based filtering
		let matchesTab = true;
		if (selectedTab === 'archive') {
			matchesTab = d.status === 'Archived';
		} else if (selectedTab !== 'all') {
			// For other tabs, exclude archived documents
			matchesTab = d.status !== 'Archived';
		}
		
		return matchesFolder && matchesSearch && matchesType && matchesStatus && matchesDateRange && matchesTab;
	}));
</script>

<div class="p-6">
	<h1 class="text-sm font-bold text-gray-800 mb-6">Document Management</h1>
	
	<div class="flex gap-6">
		<!-- Folder Tree -->
		<div class="w-64 bg-white shadow p-4">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xs font-semibold text-gray-700">Folders</h2>
				<button
					onclick={openNewFolderModal}
					class="text-[#5fc5c0] hover:text-[#114a4b]"
				>
					<Icon icon="mdi:folder-plus" class="w-4 h-4" />
				</button>
			</div>
			
			<div class="space-y-1">
				{#each combinedFolders as folder}
					<FolderTreeItem {folder} {selectedFolderId} {selectFolder} onFolderDelete={deleteFolder} onFolderUpdate={openEditFolderModal} />
				{/each}
			</div>
		</div>
		
		<!-- Documents List -->
		<div class="flex-1 bg-white shadow p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xs font-semibold text-gray-700">
					{currentCategory ? currentCategory.name : (currentFolder ? currentFolder.name : 'All Documents')}
				</h2>
				<button
					onclick={openUploadModal}
					class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
				>
					<Icon icon="mdi:upload" class="w-4 h-4" />
					<span>Upload Document</span>
				</button>
			</div>
			
			<!-- Search and Filters -->
			<div class="mb-4 p-4 bg-gray-50 border border-gray-200">
				<div class="flex gap-4 mb-3">
					<div class="flex-1">
						<label for="searchQuery" class="block text-[10px] font-medium text-gray-700 mb-1">Search</label>
						<input
							id="searchQuery"
							type="text"
							bind:value={searchQuery}
							placeholder="Search by title or filename..."
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						/>
					</div>
				</div>
				
				<div class="flex gap-4">
					<div class="flex-1">
						<label for="filterType" class="block text-[10px] font-medium text-gray-700 mb-1">Document Type</label>
						<select
							id="filterType"
							bind:value={filterDocumentTypeId}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">All Types</option>
							{#each data.documentTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>
					
					<div class="flex-1">
						<label for="filterStatus" class="block text-[10px] font-medium text-gray-700 mb-1">Status</label>
						<select
							id="filterStatus"
							bind:value={filterStatus}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						>
							<option value="">All Statuses</option>
							<option value="Draft">Draft</option>
							<option value="Pending Review">Pending Review</option>
							<option value="Approved">Approved</option>
							<option value="Rejected">Rejected</option>
							<option value="Archived">Archived</option>
						</select>
					</div>
					
					<div class="flex-1">
						<label for="filterDateFrom" class="block text-[10px] font-medium text-gray-700 mb-1">Date From</label>
						<input
							id="filterDateFrom"
							type="date"
							bind:value={filterDateFrom}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						/>
					</div>
					
					<div class="flex-1">
						<label for="filterDateTo" class="block text-[10px] font-medium text-gray-700 mb-1">Date To</label>
						<input
							id="filterDateTo"
							type="date"
							bind:value={filterDateTo}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						/>
					</div>
					
					<div class="flex items-end">
						<button
							onclick={() => { searchQuery = ''; filterDocumentTypeId = ''; filterStatus = ''; filterDateFrom = ''; filterDateTo = ''; }}
							class="px-3 py-2 text-xs text-gray-700 hover:bg-gray-200 transition-colors"
						>
							Clear Filters
						</button>
					</div>
				</div>
			</div>
			
			{#if filteredDocuments.length === 0}
				<p class="text-xs text-gray-500">No documents found.</p>
			{:else}
				<div class="space-y-2">
					{#each filteredDocuments as document}
						<div class="relative flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 transition-colors">
							<div class="flex items-center gap-3">
								<Icon icon="mdi:file-document" class="w-5 h-5 text-gray-600" />
								<div>
									<p class="text-xs font-medium text-gray-800">{document.title}</p>
									<p class="text-[10px] text-gray-500">{document.fileName}</p>
									{#if document.documentType}
										<p class="text-[10px] text-gray-400">{document.documentType.name}</p>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if document.status}
									<span class="text-[10px] px-2 py-1 bg-gray-100 text-gray-600">{document.status}</span>
								{/if}
								<div class="relative">
									<button
										onclick={() => toggleDropdown(document.id)}
										class="text-gray-500 hover:text-gray-700 p-1"
									>
										<Icon icon="mdi:dots-vertical" class="w-4 h-4" />
									</button>
									
									{#if activeDropdownId === document.id}
										<div class="absolute right-0 top-full mt-1 bg-white shadow-lg border border-gray-200 rounded-md py-1 z-50 min-w-[140px]">
											<button
												onclick={() => openPreview(document)}
												class="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:eye" class="w-4 h-4" />
												Preview
											</button>
											<button
												onclick={() => downloadDocument(document.id)}
												class="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:download" class="w-4 h-4" />
												Download
											</button>
											<button
												onclick={() => deleteDocument(document.id)}
												class="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-gray-100 flex items-center gap-2"
											>
												<Icon icon="mdi:delete" class="w-4 h-4" />
												Delete
											</button>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Preview Modal -->
{#if showPreviewModal && previewDocument}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-4xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">{previewDocument.title}</h2>
				<button onclick={closePreviewModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4 text-xs">
					<div>
						<span class="font-medium text-gray-700">Filename:</span>
						<span class="text-gray-600 ml-2">{previewDocument.fileName}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">File Size:</span>
						<span class="text-gray-600 ml-2">{previewDocument.fileSize ? (previewDocument.fileSize / 1024).toFixed(2) + ' KB' : 'N/A'}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">Document Type:</span>
						<span class="text-gray-600 ml-2">{previewDocument.documentType?.name || 'N/A'}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">Status:</span>
						<div class="mt-1">
							<select
								value={previewDocument.status}
								onchange={(e) => {
									const target = e.target as HTMLSelectElement;
									if (target) updateDocumentStatus(previewDocument.id, target.value);
								}}
								disabled={isUpdatingStatus}
								class="px-2 py-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							>
								<option value="Draft">Draft</option>
								<option value="Pending Review">Pending Review</option>
								<option value="Approved">Approved</option>
								<option value="Rejected">Rejected</option>
								<option value="Archived">Archived</option>
							</select>
						</div>
					</div>
					<div>
						<span class="font-medium text-gray-700">Created:</span>
						<span class="text-gray-600 ml-2">{previewDocument.createdAt ? new Date(previewDocument.createdAt).toLocaleString() : 'N/A'}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">Owner:</span>
						<span class="text-gray-600 ml-2">{previewDocument.owner?.firstname} {previewDocument.owner?.lastname}</span>
					</div>
				</div>
				
				{#if previewDocument.description}
					<div>
						<span class="font-medium text-gray-700 text-xs">Description:</span>
						<p class="text-gray-600 text-xs mt-1">{previewDocument.description}</p>
					</div>
				{/if}
				
				<!-- File Preview -->
				<div class="bg-gray-100 p-4 rounded-md">
					{#if previewDocument.mimeType?.startsWith('image/')}
						<img 
							src={`/api/documents/${previewDocument.id}?download=true`} 
							alt={previewDocument.fileName}
							class="max-w-full max-h-[500px] mx-auto"
						/>
					{:else if previewDocument.mimeType === 'application/pdf'}
						<iframe 
							src={`/api/documents/${previewDocument.id}?download=true`} 
							title="PDF Preview"
							class="w-full h-[500px]"
						></iframe>
					{:else if previewDocument.mimeType?.startsWith('text/')}
						<pre class="text-xs bg-white p-4 rounded overflow-auto max-h-[500px]">{previewDocument.fileName}</pre>
					{:else}
						<p class="text-xs text-gray-500 text-center">
							<Icon icon="mdi:file-document-outline" class="w-12 h-12 mx-auto mb-2" />
							Preview not available for this file type. Please download to view.
						</p>
					{/if}
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={() => downloadDocument(previewDocument.id)}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors flex items-center gap-2"
					>
						<Icon icon="mdi:download" class="w-4 h-4" />
						Download
					</button>
					<button
						onclick={closePreviewModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- New Folder Modal -->
{#if showNewFolderModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">New Folder</h2>
				<button onclick={closeNewFolderModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="folderName" class="block text-xs font-medium text-gray-700 mb-1">Folder Name *</label>
					<input
						id="folderName"
						type="text"
						bind:value={newFolderName}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter folder name"
					/>
				</div>
				
				<div>
					<label for="folderDescription" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="folderDescription"
						bind:value={newFolderDescription}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter description"
						rows="3"
					></textarea>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeNewFolderModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={createFolder}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Create
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Folder Modal -->
{#if showEditFolderModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Edit Folder</h2>
				<button onclick={closeEditFolderModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="editFolderName" class="block text-xs font-medium text-gray-700 mb-1">Folder Name *</label>
					<input
						id="editFolderName"
						type="text"
						bind:value={newFolderName}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter folder name"
					/>
				</div>
				
				<div>
					<label for="editFolderDescription" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="editFolderDescription"
						bind:value={newFolderDescription}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter description"
						rows="3"
					></textarea>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeEditFolderModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={updateFolder}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						Update
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Upload Modal -->
{#if showUploadModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-2xl w-full mx-4 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">Upload Document</h2>
				<button onclick={closeUploadModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="uploadFile" class="block text-xs font-medium text-gray-700 mb-1">File *</label>
					<input
						id="uploadFile"
						type="file"
						bind:files={uploadFile}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					/>
				</div>
				
				<div>
					<label for="uploadTitle" class="block text-xs font-medium text-gray-700 mb-1">Title *</label>
					<input
						id="uploadTitle"
						type="text"
						bind:value={uploadTitle}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter document title"
					/>
				</div>
				
				<div>
					<label for="uploadDescription" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="uploadDescription"
						bind:value={uploadDescription}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter description"
						rows="3"
					></textarea>
				</div>
				
				<div>
					<label for="uploadDocumentType" class="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
					<select
						id="uploadDocumentType"
						bind:value={uploadDocumentTypeId}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="">Select document type</option>
						{#each data.documentTypes as type}
							<option value={type.id}>{type.name}</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label for="uploadStatus" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
					<select
						id="uploadStatus"
						bind:value={uploadStatus}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
					>
						<option value="Draft">Draft</option>
						<option value="Pending Review">Pending Review</option>
						<option value="Approved">Approved</option>
						<option value="Rejected">Rejected</option>
						<option value="Archived">Archived</option>
					</select>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeUploadModal}
						disabled={isUploading}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleUpload}
						disabled={isUploading}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors disabled:opacity-50"
					>
						{isUploading ? 'Uploading...' : 'Upload'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Confirm Modal -->
<ConfirmModal 
	isOpen={showConfirmModal} 
	title={confirmModalTitle} 
	message={confirmModalMessage} 
	onConfirm={handleConfirm} 
	onCancel={handleCancelConfirm} 
/>
