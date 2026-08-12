import { writable } from 'svelte/store';

export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	title?: string;
	message: string;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<ToastMessage[]>([]);

	function add(type: ToastMessage['type'], message: string, title?: string, duration = 4000) {
		const id = Math.random().toString(36).substring(2, 9);
		const newToast: ToastMessage = { id, type, title, message, duration };

		update((toasts) => [...toasts, newToast]);

		if (duration > 0) {
			setTimeout(() => {
				remove(id);
			}, duration);
		}

		return id;
	}

	function remove(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string, title = 'Berhasil') => add('success', message, title),
		error: (message: string, title = 'Terjadi Kesalahan') => add('error', message, title),
		info: (message: string, title = 'Informasi') => add('info', message, title),
		warning: (message: string, title = 'Peringatan') => add('warning', message, title),
		remove
	};
}

export const toast = createToastStore();
