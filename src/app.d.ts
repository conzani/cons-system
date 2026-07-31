// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: bigint;
				publicId: string;
				email: string;
				firstname: string;
				lastname: string;
				roleId: bigint;
				roleName: string;
				departmentId?: bigint;
				branchId?: bigint;
				permissions: string[];
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
