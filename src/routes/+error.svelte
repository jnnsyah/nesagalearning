<script lang="ts">
	import { page } from '$app/stores';

	let timestamp = $state('—');

	$effect(() => {
		timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + 'Z';
	});

	const errorConfig = $derived(() => {
		const s = $page.status;
		if (s === 404) return {
			icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
			color: '#6366f1',
			bg: '#e0e7ff',
			title: 'Halaman Tidak Ditemukan',
			sub: 'Maaf, halaman yang Anda tuju mungkin telah dipindahkan, dihapus, atau tidak pernah ada di sistem NLC.',
		};
		if (s === 403) return {
			icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`,
			color: '#d97706',
			bg: '#fef3c7',
			title: 'Akses Ditolak',
			sub: 'Anda tidak memiliki izin untuk mengakses halaman ini. Role akun Anda tidak mencukupi.',
		};
		if (s === 401) return {
			icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`,
			color: '#0d9488',
			bg: '#ccfbf1',
			title: 'Autentikasi Diperlukan',
			sub: 'Silakan masuk terlebih dahulu untuk mengakses halaman pembelajaran NLC ini.',
		};
		return {
			icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
			color: '#dc2626',
			bg: '#fee2e2',
			title: 'Terjadi Kesalahan Server',
			sub: 'Sistem kami mengalami kendala teknis saat memproses permintaan Anda. Tim kami sedang menanganinya.',
		};
	});
</script>

<svelte:head>
	<title>Error {$page.status} — NLC</title>
</svelte:head>

<div class="error-root">
	<!-- Decorative background -->
	<div class="error-bg-glow-1"></div>
	<div class="error-bg-glow-2"></div>

	<div class="error-card">
		<!-- Status icon area -->
		<div class="error-icon-wrap" style="background: {errorConfig().bg}; color: {errorConfig().color};">
			{@html errorConfig().icon}
		</div>

		<!-- Status badge -->
		<div class="error-code-badge mt-5" style="color: {errorConfig().color}; background: {errorConfig().bg}; border-color: {errorConfig().color}22;">
			STATUS {$page.status}
		</div>

		<!-- Title & desc -->
		<h1 class="error-title mt-3">{errorConfig().title}</h1>
		<p class="error-sub mt-2">{errorConfig().sub}</p>

		<!-- Error detail (collapsible feel) -->
		{#if $page.error?.message}
			<div class="error-detail-box mt-6">
				<div class="error-detail-header">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
					<span>Pesan Detail Sistem</span>
				</div>
				<code class="error-detail-msg">{$page.error.message}</code>
			</div>
		{/if}

		<!-- Technical meta -->
		<div class="error-tech-table mt-5">
			<div class="tech-row">
				<span class="tech-label">Path URL</span>
				<code class="tech-val">{$page.url.pathname}</code>
			</div>
			<div class="tech-divider"></div>
			<div class="tech-row">
				<span class="tech-label">Waktu Sistem</span>
				<code class="tech-val">{timestamp}</code>
			</div>
		</div>

		<!-- Action buttons -->
		<div class="error-actions mt-8">
			<a href="/login" class="btn-primary" style="width: auto; padding: 12px 28px;">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
				Kembali ke Login
			</a>
			<button onclick={() => window.history.back()} class="btn-ghost" style="padding: 12px 24px;">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
				Halaman Sebelumnya
			</button>
		</div>

		<!-- Branding footer -->
		<div class="error-brand mt-8">
			<span class="nlc-logo">NLC</span>
			<span>Nesaga Learning Community</span>
		</div>
	</div>
</div>

<style>
	.error-root {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: #f8fafc;
		padding: 24px;
		position: relative;
		overflow: hidden;
	}

	.error-bg-glow-1 {
		position: absolute;
		top: -20%;
		right: -10%;
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
		pointer-events: none;
	}

	.error-bg-glow-2 {
		position: absolute;
		bottom: -20%;
		left: -10%;
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(13, 148, 136, 0.1) 0%, transparent 70%);
		pointer-events: none;
	}

	.error-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 520px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 28px;
		padding: 48px 40px;
		box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.08);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@media (max-width: 480px) {
		.error-card {
			padding: 36px 24px;
			border-radius: 20px;
		}
	}

	.error-icon-wrap {
		width: 88px;
		height: 88px;
		border-radius: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.error-code-badge {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 5px 14px;
		border-radius: 9999px;
		border: 1px solid;
	}

	.error-title {
		font-family: var(--font-macro);
		font-size: clamp(1.5rem, 4vw, 2rem);
		font-weight: 800;
		color: #0f172a;
		line-height: 1.15;
		letter-spacing: -0.02em;
	}

	.error-sub {
		font-size: 15px;
		color: #64748b;
		line-height: 1.65;
		max-width: 420px;
	}

	.error-detail-box {
		width: 100%;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 14px;
		padding: 14px 18px;
		text-align: left;
	}

	.error-detail-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #dc2626;
		margin-bottom: 8px;
	}

	.error-detail-msg {
		font-family: var(--font-mono);
		font-size: 12px;
		color: #475569;
		word-break: break-all;
		line-height: 1.5;
	}

	.error-tech-table {
		width: 100%;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 4px 0;
		text-align: left;
	}

	.tech-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		gap: 12px;
	}

	.tech-label {
		font-size: 12px;
		font-weight: 700;
		color: #64748b;
		white-space: nowrap;
	}

	.tech-val {
		font-family: var(--font-mono);
		font-size: 12px;
		color: #334155;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	}

	.tech-divider {
		height: 1px;
		background: #e2e8f0;
		margin: 0 16px;
	}

	.error-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		width: 100%;
		flex-wrap: wrap;
	}

	.error-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 600;
		color: #94a3b8;
	}

	.nlc-logo {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: #4f46e5;
		letter-spacing: -0.02em;
	}
</style>
