import { sentrySvelteKit } from "@sentry/sveltekit/vite";
import adapter from '@sveltejs/adapter-node';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sentrySvelteKit({
        org: "sdf-cn",
        project: "cons-system"
    }), tailwindcss(), sveltekit({
        experimental: {
            instrumentation: {
                server: true
            }
        },
        compilerOptions: {
            // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
            runes: ({ filename }) =>
                filename.split(/[/\\]/).includes('node_modules') ? undefined : true
        },

        // Node adapter: this app is deployed as a long-running server (internal network / VPS).
        // Set ORIGIN (e.g. https://erp.example.com) and PORT in the deployment environment.
        adapter: adapter()
    })]
});
