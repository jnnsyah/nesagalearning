<script lang="ts">
	import { page } from '$app/stores';

	let timestamp = $state('—');
	let showTechDetails = $state(false);

	$effect(() => {
		timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';
	});

	let status = $derived($page.status || 500);

	let errorMeta = $derived(() => {
		if (status === 404) {
			return {
				code: '404',
				badge: 'HALAMAN TIDAK DITEMUKAN',
				badgeClass: 'badge--indigo',
				title: 'Waduh, Halaman Tidak Ditemukan',
				sub: 'Halaman yang Anda tuju mungkin telah dipindahkan, dihapus, atau URL yang dimasukkan salah.',
				iconColor: '#4f46e5',
				iconBg: '#e0e7ff',
				iconSvg: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`
			};
		}
		if (status === 403) {
			return {
				code: '403',
				badge: 'AKSES DITOLAK',
				badgeClass: 'badge--amber',
				title: 'Akses Dibatasi',
				sub: 'Akun Anda tidak memiliki izin untuk mengakses area ini. Pastikan Anda masuk dengan role yang sesuai.',
				iconColor: '#d97706',
				iconBg: '#fef3c7',
				iconSvg: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`
			};
		}
		if (status === 401) {
			return {
				code: '401',
				badge: 'AUTENTIKASI DIPERLUKAN',
				badgeClass: 'badge--teal',
				title: 'Sesi Berakhir / Belum Login',
				sub: 'Silakan masuk terlebih dahulu ke akun NLC Anda untuk mengakses halaman ini.',
				iconColor: '#0d9488',
				iconBg: '#ccfbf1',
				iconSvg: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
			};
		}
		return {
			code: String(status),
			badge: 'KENDALA TEKNIS SERVER',
			badgeClass: 'badge--red',
			title: 'Terjadi Kendala pada Server',
			sub: 'Sistem kami mengalami kesalahan internal saat memproses permintaan Anda. Silakan coba beberapa saat lagi.',
			iconColor: '#dc2626',
			iconBg: '#fee2e2',
			iconSvg: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
		};
	});
</script>

<svelte:head>
	<title>Error {status} — NLC</title>
</svelte:head>

<div class="error-container">
	<!-- Background glows -->
	<div class="glow-1" aria-hidden="true"></div>
	<div class="glow-2" aria-hidden="true"></div>

	<main class="error-card">
		<!-- Icon ring -->
		<div class="icon-wrap" style="background: {errorMeta().iconBg}; color: {errorMeta().iconColor};">
			{@html errorMeta().iconSvg}
		</div>

		<!-- Status Badge -->
		<div class="status-badge {errorMeta().badgeClass}">
			STATUS {errorMeta().code} · {errorMeta().badge}
		</div>

		<!-- Title & Subtitle -->
		<h1 class="error-title">{errorMeta().title}</h1>
		<p class="error-sub">{errorMeta().sub}</p>

		<!-- System error traceback details (if message exists) -->
		{#if $page.error?.message}
			<div class="error-details-wrap">
				<button
					type="button"
					onclick={() => (showTechDetails = !showTechDetails)}
					class="details-toggle"
				>
					<span>Pesan Detail Sistem</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toggle-arrow" class:toggle-arrow--open={showTechDetails}>
						<polyline points="6 9 12 15 18 9"/>
					</svg>
				</button>

				{#if showTechDetails}
					<div class="details-body">
						<code class="details-code">{$page.error.message}</code>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Technical metadata box -->
		<div class="meta-box">
			<div class="meta-row">
				<span class="meta-key">URL Path</span>
				<code class="meta-val">{$page.url.pathname}</code>
			</div>
			<div class="meta-divider"></div>
			<div class="meta-row">
				<span class="meta-key">Timestamp</span>
				<code class="meta-val">{timestamp}</code>
			</div>
		</div>

		<!-- Actions -->
		<div class="actions-row">
			<a href="/" class="btn-primary-err">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
				Ke Halaman Beranda
			</a>
			<button onclick={() => window.history.back()} class="btn-ghost-err">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
				Kembali
			</button>
		</div>

		<!-- Footer logo -->
		<footer class="error-footer">
			<span class="brand-name">NLC</span>
			<span class="brand-sep">•</span>
			<span>Nesaga Learning Community</span>
		</footer>
	</main>
</div>

<style>
	.error-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8fafc;
		padding: 24px;
		position: relative;
		overflow: hidden;
	}

	.glow-1 {
		position: absolute;
		top: -15%;
		right: -10%;
		width: 460px;
		height: 460px;
		background: radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%);
		pointer-events: none;
	}

	.glow-2 {
		position: absolute;
		bottom: -15%;
		left: -10%;
		width: 460px;
		height: 460px;
		background: radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, transparent 70%);
		pointer-events: none;
	}

	.error-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 500px;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 24px;
		padding: 44px 36px;
		box-shadow: 0 20px 48px -12px rgba(15, 23, 42, 0.08);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 16px;
	}

	@media (max-width: 480px) {
		.error-card {
			padding: 32px 20px;
			border-radius: 20px;
		}
	}

	.icon-wrap {
		width: 80px;
		height: 80px;
		border-radius: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
	}

	.status-badge {
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.06em;
		padding: 5px 14px;
		border-radius: 9999px;
		border: 1px solid;
	}

	.badge--indigo { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
	.badge--amber  { background: #fef3c7; color: #b45309; border-color: #fde68a; }
	.badge--teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4; }
	.badge--red    { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

	.error-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 4vw, 1.8rem);
		font-weight: 800;
		color: #0f172a;
		line-height: 1.2;
		letter-spacing: -0.025em;
		margin: 0;
	}

	.error-sub {
		font-size: 14px;
		color: #64748b;
		line-height: 1.6;
		margin: 0;
	}

	/* System Details */
	.error-details-wrap {
		width: 100%;
		border: 1px solid #fecaca;
		border-radius: 12px;
		background: #fef2f2;
		overflow: hidden;
		text-align: left;
	}

	.details-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: transparent;
		border: none;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: #991b1b;
		cursor: pointer;
	}

	.toggle-arrow {
		transition: transform 180ms ease;
	}

	.toggle-arrow--open {
		transform: rotate(180deg);
	}

	.details-body {
		padding: 0 14px 12px;
	}

	.details-code {
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: #475569;
		word-break: break-all;
		line-height: 1.5;
	}

	/* Metadata Table */
	.meta-box {
		width: 100%;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 2px 0;
		text-align: left;
	}

	.meta-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 9px 14px;
		gap: 12px;
	}

	.meta-key {
		font-size: 11.5px;
		font-weight: 700;
		color: #64748b;
	}

	.meta-val {
		font-family: var(--font-mono);
		font-size: 11.5px;
		font-weight: 600;
		color: #1e293b;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	}

	.meta-divider {
		height: 1px;
		background: #e2e8f0;
		margin: 0 14px;
	}

	/* Buttons */
	.actions-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.btn-primary-err {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 20px;
		background: linear-gradient(135deg, #4338ca, #4f46e5 60%, #6366f1);
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #ffffff;
		text-decoration: none;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
		transition: transform 150ms ease, box-shadow 150ms ease;
	}

	.btn-primary-err:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 18px rgba(79, 70, 229, 0.4);
	}

	.btn-ghost-err {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 18px;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-ghost-err:hover {
		background: #f1f5f9;
		border-color: #94a3b8;
	}

	/* Footer */
	.error-footer {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #94a3b8;
		margin-top: 4px;
	}

	.brand-name {
		font-family: var(--font-macro);
		font-weight: 800;
		color: #4f46e5;
	}

	.brand-sep {
		font-size: 10px;
	}
</style>
