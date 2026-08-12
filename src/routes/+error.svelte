<script lang="ts">
	import { page } from '$app/stores';

	let timestamp = $state('—');

	$effect(() => {
		timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + 'Z';
	});
</script>

<svelte:head>
	<title>ERROR {$page.status} — NLC</title>
</svelte:head>

<div class="error-root">
	<!-- Crosshairs -->
	<span class="ch ch-tl">+</span>
	<span class="ch ch-tr">+</span>
	<span class="ch ch-bl">+</span>
	<span class="ch ch-br">+</span>

	<div class="error-inner">
		<!-- Status code — macro -->
		<div class="error-code">{$page.status}</div>

		<!-- Accent rule -->
		<div class="error-rule"></div>

		<!-- Label + message -->
		<div class="error-meta">
			<div class="type-mono" style="font-size: 10px; color: var(--red); letter-spacing: 0.12em;">
				[ SYSTEM ERROR DETECTED ]
			</div>

			<h1 class="error-message">
				{#if $page.status === 404}
					HALAMAN TIDAK DITEMUKAN
				{:else if $page.status === 403}
					AKSES DITOLAK
				{:else if $page.status === 401}
					AUTENTIKASI DIPERLUKAN
				{:else if $page.status === 500}
					KESALAHAN SERVER INTERNAL
				{:else}
					TERJADI KESALAHAN
				{/if}
			</h1>

			{#if $page.error?.message}
				<div class="error-detail">
					<span class="type-mono" style="font-size: 9px; color: var(--text-muted);">&gt;&gt; </span>
					<samp class="type-mono" style="font-size: 11px; color: var(--text-secondary);">
						{$page.error.message}
					</samp>
				</div>
			{/if}
		</div>

		<!-- Telemetry dump -->
		<div class="error-telemetry">
			<div class="error-telemetry__row">
				<span class="type-mono" style="font-size: 9px; color: var(--text-muted);">STATUS_CODE</span>
				<samp class="type-mono" style="font-size: 9px; color: var(--red);">{$page.status}</samp>
			</div>
			<div class="error-telemetry__row">
				<span class="type-mono" style="font-size: 9px; color: var(--text-muted);">PATH</span>
				<samp class="type-mono" style="font-size: 9px; color: var(--text-secondary);"
					>{$page.url.pathname}</samp
				>
			</div>
			<div class="error-telemetry__row">
				<span class="type-mono" style="font-size: 9px; color: var(--text-muted);">TIMESTAMP</span>
				<samp class="type-mono" style="font-size: 9px; color: var(--text-secondary);"
					>{timestamp}</samp
				>
			</div>
			<div class="error-telemetry__row">
				<span class="type-mono" style="font-size: 9px; color: var(--text-muted);">SYSTEM</span>
				<samp class="type-mono" style="font-size: 9px; color: var(--text-secondary);"
					>NLC / REV 2.0</samp
				>
			</div>
		</div>

		<!-- Actions -->
		<div class="error-actions">
			<a
				href="/"
				class="btn-primary"
				style="display: inline-block; width: auto; padding: 12px 32px;"
			>
				&gt;&gt; KEMBALI KE HOME
			</a>
			<button onclick={() => window.history.back()} class="btn-ghost" style="padding: 12px 24px;">
				&larr; HALAMAN SEBELUMNYA
			</button>
		</div>
	</div>
</div>

<style>
	.error-root {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: 100vh;
		background: var(--bg-base);
		padding: 40px 24px;
		overflow: hidden;
	}

	/* Crosshairs */
	.ch {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--text-ghost);
		line-height: 1;
	}
	.ch-tl {
		top: 16px;
		left: 20px;
	}
	.ch-tr {
		top: 16px;
		right: 20px;
	}
	.ch-bl {
		bottom: 16px;
		left: 20px;
	}
	.ch-br {
		bottom: 16px;
		right: 20px;
	}

	.error-inner {
		width: 100%;
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	/* Giant status code in background style */
	.error-code {
		font-family: var(--font-macro);
		font-size: clamp(6rem, 20vw, 16rem);
		line-height: 0.85;
		letter-spacing: -0.06em;
		text-transform: uppercase;
		color: var(--text-ghost);
		pointer-events: none;
		user-select: none;
	}

	.error-rule {
		width: 48px;
		height: 2px;
		background: var(--red);
	}

	.error-meta {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.error-message {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 4vw, 2.8rem);
		line-height: 0.95;
		letter-spacing: -0.03em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.error-detail {
		display: flex;
		align-items: flex-start;
		gap: 4px;
		padding: 10px 14px;
		border: 1px solid var(--border-soft);
		border-left: 2px solid var(--border-hard);
		background: var(--bg-inset);
	}

	/* Telemetry dump block */
	.error-telemetry {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border-hard);
		background: var(--bg-panel);
	}

	.error-telemetry__row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 16px;
		border-bottom: 1px solid var(--border-soft);
		gap: 16px;
	}

	.error-telemetry__row:last-child {
		border-bottom: none;
	}

	.error-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
</style>
