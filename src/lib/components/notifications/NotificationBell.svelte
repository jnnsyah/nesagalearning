<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	interface NotificationItem {
		id: number;
		userId: number;
		type: string;
		title: string;
		message: string | null;
		isRead: boolean;
		createdAt: string | Date;
	}

	let isOpen = $state(false);
	let isLoading = $state(false);
	let notifications = $state<NotificationItem[]>([]);
	let unreadCount = $state(0);

	async function fetchNotifications() {
		try {
			isLoading = true;
			const res = await fetch('/api/notifications');
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					notifications = data.items || [];
					unreadCount = data.unreadCount || 0;
				}
			}
		} catch (err) {
			console.error('Failed to fetch notifications:', err);
		} finally {
			isLoading = false;
		}
	}

	async function markAsRead(id: number) {
		try {
			const target = notifications.find((n) => n.id === id);
			if (target && !target.isRead) {
				target.isRead = true;
				unreadCount = Math.max(0, unreadCount - 1);
			}

			await fetch('/api/notifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
		} catch (err) {
			console.error('Failed to mark notification as read:', err);
		}
	}

	async function markAllAsRead() {
		try {
			notifications = notifications.map((n) => ({ ...n, isRead: true }));
			unreadCount = 0;

			const res = await fetch('/api/notifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'mark_all_read' })
			});

			if (res.ok) {
				toast.success('Semua notifikasi ditandai sudah dibaca.');
			}
		} catch (err) {
			console.error('Failed to mark all as read:', err);
		}
	}

	function formatTimeAgo(dateInput: string | Date): string {
		if (!dateInput) return '';
		const d = new Date(dateInput);
		const diffMs = Date.now() - d.getTime();
		const diffSec = Math.floor(diffMs / 1000);
		if (diffSec < 60) return 'Baru saja';
		const diffMin = Math.floor(diffSec / 60);
		if (diffMin < 60) return `${diffMin}m lalu`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}j lalu`;
		const diffDay = Math.floor(diffHr / 24);
		return `${diffDay}h lalu`;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			fetchNotifications();
		}
	}

	function closeDropdown(e: MouseEvent) {
		const container = document.getElementById('notif-bell-container');
		if (container && !container.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	onMount(() => {
		fetchNotifications();
		// Poll every 30 seconds for new notifications
		const interval = setInterval(fetchNotifications, 30000);
		window.addEventListener('click', closeDropdown);

		return () => {
			clearInterval(interval);
			window.removeEventListener('click', closeDropdown);
		};
	});
</script>

<div id="notif-bell-container" class="relative">
	<button
		type="button"
		onclick={toggleDropdown}
		class="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
		title="Notifikasi Sistem"
		aria-label="Notifikasi Sistem"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
			<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
		</svg>

		{#if unreadCount > 0}
			<span class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse">
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>

	{#if isOpen}
		<div class="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[480px]">
			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
				<div class="flex items-center gap-2">
					<h4 class="font-bold text-slate-900 text-sm">Notifikasi</h4>
					{#if unreadCount > 0}
						<span class="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
							{unreadCount} Baru
						</span>
					{/if}
				</div>

				{#if unreadCount > 0}
					<button
						type="button"
						onclick={markAllAsRead}
						class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
					>
						Tandai Semua Dibaca
					</button>
				{/if}
			</div>

			<!-- List -->
			<div class="overflow-y-auto divide-y divide-slate-100 flex-1">
				{#if isLoading && notifications.length === 0}
					<div class="p-6 text-center text-xs text-slate-400">Memuat notifikasi...</div>
				{:else if notifications.length === 0}
					<div class="p-8 text-center">
						<div class="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
						</div>
						<p class="text-xs font-semibold text-slate-600">Belum Ada Notifikasi</p>
						<p class="text-[11px] text-slate-400 mt-0.5">Pemberitahuan tugas & aktivitas akan muncul di sini.</p>
					</div>
				{:else}
					{#each notifications as item (item.id)}
						<button
							type="button"
							onclick={() => markAsRead(item.id)}
							class="w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 relative {item.isRead ? 'opacity-75 bg-white' : 'bg-indigo-50/30'}"
						>
							{#if !item.isRead}
								<span class="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-2 mb-0.5">
									<h5 class="text-xs font-bold text-slate-900 truncate">{item.title}</h5>
									<span class="text-[10px] font-medium text-slate-400 shrink-0">{formatTimeAgo(item.createdAt)}</span>
								</div>
								{#if item.message}
									<p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.message}</p>
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
