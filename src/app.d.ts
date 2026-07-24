// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: number;
				publicId: string;
				email: string;
				firstname: string;
				lastname: string;
				roleId: number;
				roleName: string;
				departmentId?: number;
				branchId?: number;
				permissions: string[];
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
