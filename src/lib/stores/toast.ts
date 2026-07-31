import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show: (message: string, type: ToastType = 'success', duration = 3000) => {
			const id = Date.now().toString();
			const toast: Toast = { id, message, type, duration };
			update(toasts => [...toasts, toast]);
			
			setTimeout(() => {
				update(toasts => toasts.filter(t => t.id !== id));
			}, duration);
		},
		success: (message: string, duration?: number) => {
			const id = Date.now().toString();
			const toast: Toast = { id, message, type: 'success', duration };
			update(toasts => [...toasts, toast]);
			
			setTimeout(() => {
				update(toasts => toasts.filter(t => t.id !== id));
			}, duration || 3000);
		},
		error: (message: string, duration?: number) => {
			const id = Date.now().toString();
			const toast: Toast = { id, message, type: 'error', duration };
			update(toasts => [...toasts, toast]);
			
			setTimeout(() => {
				update(toasts => toasts.filter(t => t.id !== id));
			}, duration || 3000);
		},
		info: (message: string, duration?: number) => {
			const id = Date.now().toString();
			const toast: Toast = { id, message, type: 'info', duration };
			update(toasts => [...toasts, toast]);
			
			setTimeout(() => {
				update(toasts => toasts.filter(t => t.id !== id));
			}, duration || 3000);
		},
		remove: (id: string) => {
			update(toasts => toasts.filter(t => t.id !== id));
		}
	};
}

export const toast = createToastStore();
