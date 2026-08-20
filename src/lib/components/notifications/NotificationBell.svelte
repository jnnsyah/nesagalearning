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
	let activeTab = $state<'all' | 'unread'>('all');

	let displayedNotifications = $derived(
		activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
	);

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

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	onMount(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30000);
		window.addEventListener('click', closeDropdown);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			clearInterval(interval);
			window.removeEventListener('click', closeDropdown);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div id="notif-bell-container" class="relative">
	<!-- Bell Action Button -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
		title="Notifikasi Sistem"
		aria-label="Notifikasi Sistem"
		aria-expanded={isOpen}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-200 {isOpen ? 'scale-110 text-indigo-600' : ''}">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
			<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
		</svg>

		{#if unreadCount > 0}
			<span class="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm shadow-rose-500/50 animate-pulse">
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown Panel -->
	{#if isOpen}
		<div class="fixed inset-x-4 top-16 sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 w-auto sm:w-96 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-200">
			<!-- Top Header -->
			<div class="px-4 pt-3.5 pb-3 bg-slate-50/80 border-b border-slate-100 flex flex-col gap-2.5">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<h4 class="font-bold text-slate-900 text-sm tracking-tight">Notifikasi</h4>
						{#if unreadCount > 0}
							<span class="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-500 text-white rounded-full shadow-sm">
								{unreadCount} Baru
							</span>
						{/if}
					</div>

					{#if unreadCount > 0}
						<button
							type="button"
							onclick={markAllAsRead}
							class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-all"
						>
							Tandai Semua Dibaca
						</button>
					{/if}
				</div>

				<!-- Filter Tabs -->
				<div class="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-lg text-xs font-semibold text-slate-600">
					<button
						type="button"
						onclick={() => (activeTab = 'all')}
						class="flex-1 py-1 text-center rounded-md transition-all {activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'}"
					>
						Semua ({notifications.length})
					</button>
					<button
						type="button"
						onclick={() => (activeTab = 'unread')}
						class="flex-1 py-1 text-center rounded-md transition-all {activeTab === 'unread' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'hover:text-slate-900'}"
					>
						Belum Dibaca ({unreadCount})
					</button>
				</div>
			</div>

			<!-- List Content -->
			<div class="overflow-y-auto divide-y divide-slate-100/80 flex-1">
				{#if isLoading && notifications.length === 0}
					<div class="p-8 text-center text-xs font-medium text-slate-400">
						<svg class="animate-spin h-5 w-5 text-indigo-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Memuat notifikasi...
					</div>
				{:else if displayedNotifications.length === 0}
					<div class="p-10 text-center">
						<div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
						</div>
						<p class="text-xs font-bold text-slate-700">
							{activeTab === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
						</p>
						<p class="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
							{activeTab === 'unread' ? 'Semua notifikasi kamu sudah dibaca.' : 'Pemberitahuan tugas & aktivitas akan muncul di sini.'}
						</p>
					</div>
				{:else}
					{#each displayedNotifications as item (item.id)}
						<button
							type="button"
							onclick={() => markAsRead(item.id)}
							class="w-full text-left p-3.5 hover:bg-slate-50/80 active:bg-slate-100 transition-colors flex items-start gap-3 relative group {item.isRead ? 'bg-white opacity-80' : 'bg-indigo-50/40 font-medium'}"
						>
							<!-- Type Icon Badge -->
							<div class="shrink-0 mt-0.5">
								{#if item.title.includes('Disetujui')}
									<div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
									</div>
								{:else if item.title.includes('Revisi')}
									<div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
									</div>
								{:else if item.type === 'advisor_note'}
									<div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
									</div>
								{:else}
									<div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
									</div>
								{/if}
							</div>

							<!-- Message Body -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-2 mb-0.5">
									<h5 class="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{item.title}</h5>
									<span class="text-[10px] font-semibold text-slate-400 shrink-0">{formatTimeAgo(item.createdAt)}</span>
								</div>
								{#if item.message}
									<p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.message}</p>
								{/if}
							</div>

							<!-- Unread Dot Indicator -->
							{#if !item.isRead}
								<span class="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0 shadow-xs shadow-indigo-600/50"></span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
