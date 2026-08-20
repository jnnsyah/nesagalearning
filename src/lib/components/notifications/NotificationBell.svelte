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

<div id="notif-bell-container" class="notif-bell-wrapper">
	<!-- Bell Action Button -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="btn-bell"
		class:btn-bell--active={isOpen}
		title="Notifikasi Sistem"
		aria-label="Notifikasi Sistem"
		aria-expanded={isOpen}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
			<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
		</svg>

		{#if unreadCount > 0}
			<span class="bell-badge">
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown Panel -->
	{#if isOpen}
		<div class="notif-dropdown">
			<!-- Top Header -->
			<div class="dropdown-header">
				<div class="header-title-row">
					<div class="title-group">
						<h4 class="notif-title">Notifikasi</h4>
						{#if unreadCount > 0}
							<span class="count-pill">{unreadCount} Baru</span>
						{/if}
					</div>

					{#if unreadCount > 0}
						<button type="button" onclick={markAllAsRead} class="btn-mark-all">
							Tandai Semua Dibaca
						</button>
					{/if}
				</div>

				<!-- Filter Tabs -->
				<div class="notif-tabs">
					<button
						type="button"
						onclick={() => (activeTab = 'all')}
						class="tab-btn"
						class:tab-btn--active={activeTab === 'all'}
					>
						Semua ({notifications.length})
					</button>
					<button
						type="button"
						onclick={() => (activeTab = 'unread')}
						class="tab-btn"
						class:tab-btn--active={activeTab === 'unread'}
					>
						Belum Dibaca ({unreadCount})
					</button>
				</div>
			</div>

			<!-- List Content -->
			<div class="dropdown-body">
				{#if isLoading && notifications.length === 0}
					<div class="empty-state">
						<svg class="spin-spinner" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
						<p class="empty-text">Memuat notifikasi...</p>
					</div>
				{:else if displayedNotifications.length === 0}
					<div class="empty-state">
						<div class="empty-icon-wrap">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
						</div>
						<p class="empty-title">
							{activeTab === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
						</p>
						<p class="empty-sub">
							{activeTab === 'unread' ? 'Semua notifikasi kamu sudah dibaca.' : 'Pemberitahuan tugas & aktivitas akan muncul di sini.'}
						</p>
					</div>
				{:else}
					{#each displayedNotifications as item (item.id)}
						<button
							type="button"
							onclick={() => markAsRead(item.id)}
							class="notif-item"
							class:notif-item--unread={!item.isRead}
						>
							<!-- Type Icon Badge -->
							<div class="icon-avatar">
								{#if item.title.includes('Disetujui')}
									<div class="type-icon type-icon--success">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
									</div>
								{:else if item.title.includes('Revisi')}
									<div class="type-icon type-icon--warning">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
									</div>
								{:else if item.type === 'advisor_note'}
									<div class="type-icon type-icon--info">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
									</div>
								{:else}
									<div class="type-icon type-icon--primary">
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
									</div>
								{/if}
							</div>

							<!-- Message Body -->
							<div class="item-content">
								<div class="item-header">
									<h5 class="item-title">{item.title}</h5>
									<span class="item-time">{formatTimeAgo(item.createdAt)}</span>
								</div>
								{#if item.message}
									<p class="item-message">{item.message}</p>
								{/if}
							</div>

							<!-- Unread Dot Indicator -->
							{#if !item.isRead}
								<span class="unread-dot"></span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.notif-bell-wrapper {
		position: relative;
	}

	.btn-bell {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: var(--radius-md, 12px);
		border: 1px solid var(--border-subtle, #e2e8f0);
		background: #ffffff;
		color: var(--text-secondary, #64748b);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-bell:hover {
		background: var(--bg-inset, #f8fafc);
		color: var(--text-primary, #0f172a);
		border-color: var(--border-hard, #cbd5e1);
		transform: translateY(-1px);
	}

	.btn-bell--active {
		background: var(--bg-inset, #f8fafc);
		color: #4f46e5;
		border-color: #818cf8;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
	}

	.bell-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 999px;
		background: linear-gradient(135deg, #ef4444, #dc2626);
		color: #ffffff;
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 10px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #ffffff;
		box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
		animation: pulseBadge 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulseBadge {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.08); }
	}

	.notif-dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		width: 380px;
		max-height: 520px;
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: var(--radius-xl, 18px);
		box-shadow: 0 20px 48px -10px rgba(15, 23, 42, 0.18);
		z-index: 99950;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: dropdownPop 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@media (max-width: 640px) {
		.notif-dropdown {
			position: fixed;
			left: 12px;
			right: 12px;
			top: 68px;
			width: auto;
			max-height: calc(100vh - 100px);
		}
	}

	@keyframes dropdownPop {
		from { opacity: 0; transform: scale(0.96) translateY(-6px); }
		to   { opacity: 1; transform: scale(1) translateY(0); }
	}

	.dropdown-header {
		padding: 14px 16px 12px;
		background: var(--bg-inset, #f8fafc);
		border-bottom: 1px solid var(--border-subtle, #e2e8f0);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.header-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.notif-title {
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.count-pill {
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(79, 70, 229, 0.1);
		color: #4f46e5;
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 10.5px;
		font-weight: 800;
	}

	.btn-mark-all {
		background: none;
		border: none;
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: #4f46e5;
		cursor: pointer;
		padding: 0;
		transition: color 150ms ease;
	}

	.btn-mark-all:hover {
		color: #3730a3;
		text-decoration: underline;
	}

	.notif-tabs {
		display: flex;
		align-items: center;
		gap: 4px;
		background: #e2e8f0;
		padding: 3px;
		border-radius: var(--radius-md, 10px);
	}

	.tab-btn {
		flex: 1;
		padding: 5px 8px;
		border: none;
		background: transparent;
		border-radius: 7px;
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-secondary, #64748b);
		cursor: pointer;
		transition: all 150ms ease;
		text-align: center;
	}

	.tab-btn--active {
		background: #ffffff;
		color: var(--text-primary, #0f172a);
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
	}

	.dropdown-body {
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		divide-y: 1px solid var(--border-subtle, #f1f5f9);
	}

	.empty-state {
		padding: 36px 20px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.empty-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--bg-inset, #f1f5f9);
		color: var(--text-secondary, #94a3b8);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 10px;
	}

	.empty-title {
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.empty-sub {
		font-size: 11.5px;
		color: var(--text-secondary, #64748b);
		margin-top: 4px;
		max-width: 240px;
		line-height: 1.45;
	}

	.empty-text {
		font-size: 12px;
		color: var(--text-secondary, #64748b);
		margin-top: 8px;
	}

	.spin-spinner {
		color: #4f46e5;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}

	.notif-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 13px 16px;
		width: 100%;
		border: none;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
		background: #ffffff;
		text-align: left;
		cursor: pointer;
		transition: background 150ms ease;
		position: relative;
	}

	.notif-item:hover {
		background: var(--bg-inset, #f8fafc);
	}

	.notif-item--unread {
		background: rgba(240, 242, 254, 0.5);
	}

	.icon-avatar {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.type-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md, 10px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.type-icon--success { background: #dcfce7; color: #16a34a; }
	.type-icon--warning { background: #fef3c7; color: #d97706; }
	.type-icon--info    { background: #e0e7ff; color: #4f46e5; }
	.type-icon--primary { background: #e0e7ff; color: #4338ca; }

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 2px;
	}

	.item-title {
		font-family: var(--font-macro, 'Plus Jakarta Sans', sans-serif);
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-time {
		font-size: 10.5px;
		font-weight: 600;
		color: var(--text-secondary, #94a3b8);
		flex-shrink: 0;
	}

	.item-message {
		font-size: 12px;
		color: var(--text-secondary, #475569);
		margin: 0;
		line-height: 1.45;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.unread-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #4f46e5;
		flex-shrink: 0;
		margin-top: 6px;
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}
</style>
