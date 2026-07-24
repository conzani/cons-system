<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>

<div class="min-h-screen flex">
	<!-- Left Section - Blue Background with Branding -->
	<div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
		<!-- Mountain silhouette background -->
		<div class="absolute bottom-0 left-0 right-0">
			<svg viewBox="0 0 1440 320" class="w-full h-auto opacity-20">
				<path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
			</svg>
		</div>
		
		<!-- Content -->
		<div class="relative z-10 flex flex-col items-center justify-center h-full w-full px-12 text-center">
			<!-- Logo placeholder -->
			<div class="mb-6">
				<div class="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
					<svg class="w-16 h-16 text-blue-900" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
					</svg>
				</div>
			</div>
			
			<h1 class="text-3xl font-bold text-yellow-400 mb-2">Nepal Telecom</h1>
			<h2 class="text-4xl font-bold text-white mb-2">INTERCONNECT</h2>
			<p class="text-xl text-blue-200 mb-8">Billing & Accounting</p>
			
			<!-- Copyright -->
			<div class="absolute bottom-8 left-12 text-blue-200 text-sm">
				© 2016, Nepal Doorsanchar Company Limited, All Rights Reserved.
			</div>
		</div>
	</div>
	
	<!-- Right Section - White Background with Login Form -->
	<div class="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12">
		<div class="w-full max-w-md">
			<h1 class="text-3xl font-bold text-gray-800 mb-8">STAFF LOG IN</h1>
			
			<form method="POST" use:enhance>
				<div class="mb-6">
					<input
						type="email"
						id="email"
						name="email"
						placeholder="Email Address"
						class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
						value={form?.email ?? ''}
					/>
				</div>
				
				<div class="mb-6">
					<input
						type="password"
						id="password"
						name="password"
						placeholder="Password"
						class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
					/>
				</div>
				
				{#if form?.missing}
					<p class="text-red-500 text-sm mb-4">Please fill in all fields</p>
				{/if}
				
				{#if form?.invalid}
					<p class="text-red-500 text-sm mb-4">Invalid email or password</p>
				{/if}
				
				<button
					type="submit"
					class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
				>
					LOGIN IN »
				</button>
				
				<div class="mt-4 text-center">
					<button type="button" class="text-blue-600 hover:text-blue-800 text-sm bg-transparent border-none cursor-pointer">Forgot Password?</button>
				</div>
			</form>
		</div>
	</div>
</div>
