<script lang="ts">
	import Icon from '@iconify/svelte';
	let { data }: { data: { company: any } } = $props();
	
	let showModal = $state(false);
	let isEditing = $state(false);
	let name = $state('');
	let registrationNumber = $state('');
	let taxId = $state('');
	let address = $state('');
	let phone = $state('');
	let email = $state('');
	let website = $state('');
	let logo = $state('');

	function openModal() {
		if (data.company) {
			isEditing = true;
			name = data.company.name || '';
			registrationNumber = data.company.registrationNumber || '';
			taxId = data.company.taxId || '';
			address = data.company.address || '';
			phone = data.company.phone || '';
			email = data.company.email || '';
			website = data.company.website || '';
			logo = data.company.logo || '';
		} else {
			isEditing = false;
			name = '';
			registrationNumber = '';
			taxId = '';
			address = '';
			phone = '';
			email = '';
			website = '';
			logo = '';
		}
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		isEditing = false;
		name = '';
		registrationNumber = '';
		taxId = '';
		address = '';
		phone = '';
		email = '';
		website = '';
		logo = '';
	}

	async function handleSave() {
		try {
			const method = isEditing ? 'PUT' : 'POST';
			const url = isEditing ? `/api/admin/company/${data.company.id}` : '/api/admin/company';
			
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					name, 
					registrationNumber, 
					taxId, 
					address, 
					phone, 
					email, 
					website, 
					logo 
				})
			});
			
			if (response.ok) {
				closeModal();
				window.location.reload();
			} else {
				const responseData = await response.json();
				alert(responseData.error || 'Failed to save company profile');
			}
		} catch (error) {
			console.error('Error saving company profile:', error);
			alert('Failed to save company profile');
		}
	}
</script>

<div class="p-6">
	<a href="/settings" class="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-4">
		<Icon icon="mdi:arrow-left" class="w-4 h-4" />
		<span>Back to Settings</span>
	</a>
	
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-sm font-bold text-gray-800">Company Profile</h1>
		<button
			onclick={openModal}
			class="flex items-center gap-2 px-3 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
		>
			<Icon icon={data.company ? 'mdi:pencil' : 'mdi:plus'} class="w-4 h-4" />
			<span>{data.company ? 'Edit Profile' : 'Add Profile'}</span>
		</button>
	</div>

	{#if data.company}
		<div class="bg-white shadow">
			<div class="p-6">
				<div class="flex items-start gap-6 mb-6">
					{#if data.company.logo}
						<img src={data.company.logo} alt="Company Logo" class="w-24 h-24 object-cover rounded-lg border border-gray-200" />
					{:else}
						<div class="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
							<Icon icon="mdi:office-building" class="w-12 h-12 text-gray-400" />
						</div>
					{/if}
					<div>
						<h2 class="text-sm font-bold text-gray-800">{data.company.name}</h2>
						{#if data.company.registrationNumber}
							<p class="text-xs text-gray-600 mt-1">Reg: {data.company.registrationNumber}</p>
						{/if}
						{#if data.company.taxId}
							<p class="text-xs text-gray-600">Tax ID: {data.company.taxId}</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#if data.company.address}
						<div>
							<h3 class="text-xs font-semibold text-gray-700 mb-2">Address</h3>
							<p class="text-xs text-gray-600">{data.company.address}</p>
						</div>
					{/if}
					{#if data.company.phone}
						<div>
							<h3 class="text-xs font-semibold text-gray-700 mb-2">Phone</h3>
							<p class="text-xs text-gray-600">{data.company.phone}</p>
						</div>
					{/if}
					{#if data.company.email}
						<div>
							<h3 class="text-xs font-semibold text-gray-700 mb-2">Email</h3>
							<p class="text-xs text-gray-600">{data.company.email}</p>
						</div>
					{/if}
					{#if data.company.website}
						<div>
							<h3 class="text-xs font-semibold text-gray-700 mb-2">Website</h3>
							<a href={data.company.website} target="_blank" class="text-xs text-[#5fc5c0] hover:underline">{data.company.website}</a>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="bg-white shadow p-6">
			<p class="text-xs text-gray-500">No company profile found. Click "Add Profile" to create one.</p>
		</div>
	{/if}
</div>

<!-- Add/Edit Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
		<div class="bg-white p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-sm font-bold text-gray-800">{isEditing ? 'Edit Company Profile' : 'Add Company Profile'}</h2>
				<button onclick={closeModal} class="text-gray-500 hover:text-gray-700">
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			
			<div class="space-y-4">
				<div>
					<label for="company-name" class="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
					<input
						id="company-name"
						type="text"
						bind:value={name}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter company name"
					/>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="company-reg" class="block text-xs font-medium text-gray-700 mb-1">Registration Number</label>
						<input
							id="company-reg"
							type="text"
							bind:value={registrationNumber}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Enter registration number"
						/>
					</div>
					
					<div>
						<label for="company-tax" class="block text-xs font-medium text-gray-700 mb-1">Tax ID/VAT Number</label>
						<input
							id="company-tax"
							type="text"
							bind:value={taxId}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Enter tax ID"
						/>
					</div>
				</div>
				
				<div>
					<label for="company-address" class="block text-xs font-medium text-gray-700 mb-1">Physical Address</label>
					<textarea
						id="company-address"
						bind:value={address}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter physical address"
						rows="3"
					></textarea>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="company-phone" class="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
						<input
							id="company-phone"
							type="text"
							bind:value={phone}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Enter phone number"
						/>
					</div>
					
					<div>
						<label for="company-email" class="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
						<input
							id="company-email"
							type="email"
							bind:value={email}
							class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
							placeholder="Enter email address"
						/>
					</div>
				</div>
				
				<div>
					<label for="company-website" class="block text-xs font-medium text-gray-700 mb-1">Website URL</label>
					<input
						id="company-website"
						type="text"
						bind:value={website}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter website URL"
					/>
				</div>
				
				<div>
					<label for="company-logo" class="block text-xs font-medium text-gray-700 mb-1">Logo URL</label>
					<input
						id="company-logo"
						type="text"
						bind:value={logo}
						class="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5fc5c0] text-xs"
						placeholder="Enter logo URL"
					/>
				</div>
				
				<div class="flex justify-end gap-3 mt-6">
					<button
						onclick={closeModal}
						class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleSave}
						class="px-4 py-2 bg-[#5fc5c0] text-white text-xs hover:bg-[#114a4b] transition-colors"
					>
						{isEditing ? 'Update' : 'Save'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
