<script lang="ts">
	import { enhance } from '$app/forms';
	import constructionImage from '$lib/assets/construction.png';
	import logoPlus from '$lib/assets/logoplus.png';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);
</script>

<div class="min-h-screen flex">
	<!-- Left Section - Branding -->
	<div class="hidden lg:block lg:w-[60%] relative">
		<img
			src={constructionImage}
			alt=""
			class="absolute inset-0 h-full w-full object-cover"
		/>
		<div class="absolute inset-0 bg-black/40"></div>

		<div class="absolute top-12 left-4">
			<img src={logoPlus} alt="Company logo" class="h-15 object-contain" />
		</div>

		<div class="absolute bottom-12 left-4 right-12 text-left px-4">
			<h1 class="text-5xl font-bold text-white mb-4 tracking-wide">Everything Your Construction Business Needs.</h1>
			<h2 class="text-3xl font-bold text-[#ff3131] mb-6 tracking-wide">One Platform.</h2>
			<p class="text-1xl text-gray-200 max-w-2xl leading-relaxed">
				Win more tenders, manage projects efficiently, control costs, and keep your entire workforce connected from the office to the construction site.
			</p>
		</div>
	</div>

	<!-- Right Section - Login Form -->
	<div class="w-full lg:w-[40%] flex items-center justify-center bg-gray-50 px-8 py-12">
		<div class="w-full max-w-md bg-white shadow-xl p-8">
			<h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">STAFF LOG IN</h1>

			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<div class="mb-6">
					<label for="email" class="sr-only">Email Address</label>
					<input
						type="email"
						id="email"
						name="email"
						placeholder="Email Address"
						autocomplete="email"
						class="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
						value={form?.email ?? ''}
						aria-invalid={form?.invalid ? 'true' : undefined}
					/>
				</div>

				<div class="mb-6">
					<label for="password" class="sr-only">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						placeholder="Password"
						autocomplete="current-password"
						class="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
						aria-invalid={form?.invalid ? 'true' : undefined}
					/>
				</div>

				{#if form?.missing}
					<p class="text-red-500 text-sm mb-4" role="alert">Please fill in all fields</p>
				{/if}

				{#if form?.invalid}
					<p class="text-red-500 text-sm mb-4" role="alert">Invalid email or password</p>
				{/if}

				<button
					type="submit"
					disabled={submitting}
					class="w-full bg-[#5fc5c0] text-white py-3 px-4 hover:bg-[#114a4b] focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
				>
					{submitting ? 'Logging in…' : 'LOG IN »'}
				</button>

				<div class="mt-4 text-center">
					<a href="/forgot-password" class="text-blue-600 hover:text-blue-800 text-sm">
						Forgot Password?
					</a>
				</div>
			</form>
		</div>
	</div>
</div>