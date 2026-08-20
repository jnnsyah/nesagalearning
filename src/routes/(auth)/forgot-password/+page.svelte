<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Lupa Password — Nesaga Learning Community</title>
</svelte:head>

<div class="auth-root">
	<!-- Animated gradient background -->
	<div class="gradient-bg" aria-hidden="true">
		<div class="blob blob-1"></div>
		<div class="blob blob-2"></div>
		<div class="blob blob-3"></div>
		<div class="blob blob-4"></div>
	</div>

	<!-- Auth card -->
	<div class="auth-card">
		<!-- Brand header -->
		<div class="auth-brand">
			<div class="nlc-mark">NLC</div>
			<div class="nlc-tagline">Nesaga Learning Community</div>
			<div class="brand-chip">
				<span class="chip-dot"></span>
				Bantuan Pemulihan Akun
			</div>
		</div>

		<!-- Form header -->
		<div class="auth-heading">
			<h1>Lupa Password?</h1>
			<p>Masukkan username atau alamat email Anda untuk menerima instruksi pemulihan password.</p>
		</div>

		{#if !data.isEmailConfigured}
			<div class="alert-warning">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
					<line x1="12" y1="9" x2="12" y2="13"/>
					<line x1="12" y1="17" x2="12.01" y2="17"/>
				</svg>
				<span>Pengiriman email notifikasi sedang tidak aktif. Silakan hubungi Administrator sekolah untuk mereset password secara langsung.</span>
			</div>
		{/if}

		{#if form?.error}
			<div class="alert-form-error">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="8" x2="12" y2="12"/>
					<line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<span>{form.error}</span>
			</div>
		{/if}

		{#if form?.success && form?.message}
			<div class="alert-form-success">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
					<polyline points="22 4 12 14.01 9 11.01"/>
				</svg>
				<div>
					<strong>Permintaan Dikirim!</strong>
					<p>{form.message}</p>
				</div>
			</div>

			<div class="mt-6 text-center">
				<a href="/login" class="back-link">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="19" y1="12" x2="5" y2="12"/>
						<polyline points="12 19 5 12 12 5"/>
					</svg>
					<span>Kembali ke Halaman Login</span>
				</a>
			</div>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="auth-form"
			>
				<div class="field-group">
					<label for="identifier" class="field-label-clean">Username atau Email Akun</label>
					<div class="input-wrap">
						<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
							<polyline points="22,6 12,13 2,6"/>
						</svg>
						<input
							id="identifier"
							name="identifier"
							type="text"
							required
							value={form?.identifier ?? ''}
							placeholder="Masukkan username atau email Anda"
							class="clean-input"
						/>
					</div>
				</div>

				<button type="submit" class="submit-btn" disabled={isSubmitting || !data.isEmailConfigured}>
					{#if isSubmitting}
						<span class="spinner"></span>
						<span>Mengirim Instruksi...</span>
					{:else}
						<span>Kirim Tautan Reset Password</span>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="5" y1="12" x2="19" y2="12"/>
							<polyline points="12 5 19 12 12 19"/>
						</svg>
					{/if}
				</button>

				<div class="auth-footer-links">
					<a href="/login" class="back-link">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="19" y1="12" x2="5" y2="12"/>
							<polyline points="12 19 5 12 12 5"/>
						</svg>
						<span>Sudah ingat password? Login disini</span>
					</a>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.auth-root {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		position: relative;
		background: #f8fafc;
		overflow: hidden;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.gradient-bg {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.55;
		animation: drift 14s ease-in-out infinite alternate;
	}
	.blob-1 { top: -15%; left: -10%; width: 550px; height: 550px; background: radial-gradient(circle, #c7d2fe, #818cf8); }
	.blob-2 { bottom: -15%; right: -10%; width: 480px; height: 480px; background: radial-gradient(circle, #99f6e4, #5eead4); }
	.blob-3 { top: 40%; left: 50%; width: 400px; height: 400px; background: radial-gradient(circle, #fde68a, #fbbf24); opacity: 0.35; }
	.blob-4 { top: 10%; right: 5%; width: 350px; height: 350px; background: radial-gradient(circle, #ddd6fe, #a78bfa); opacity: 0.4; }

	@keyframes drift {
		0% { transform: translate(0, 0) scale(1); }
		50% { transform: translate(30px, -20px) scale(1.05); }
		100% { transform: translate(-20px, 30px) scale(0.95); }
	}

	.auth-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 440px;
		background: rgba(255, 255, 255, 0.88);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.7);
		border-radius: 28px;
		padding: 40px 36px;
		box-shadow:
			0 4px 24px rgba(79, 70, 229, 0.08),
			0 24px 64px rgba(15, 23, 42, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	@media (max-width: 480px) {
		.auth-card { padding: 32px 24px; border-radius: 22px; }
	}

	.auth-brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		margin-bottom: 24px;
	}

	.nlc-mark {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 3.2rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.045em;
		background: linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4f46e5 70%, #6366f1 100%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: 4px;
	}

	.nlc-tagline {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 14px;
		font-weight: 700;
		color: #334155;
		margin-bottom: 8px;
	}

	.brand-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 12px;
		border-radius: 9999px;
		background: rgba(79, 70, 229, 0.08);
		border: 1px solid rgba(79, 70, 229, 0.18);
		font-family: var(--font-mono, monospace);
		font-size: 10.5px;
		font-weight: 700;
		color: #4338ca;
	}

	.chip-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #818cf8;
	}

	.auth-heading {
		text-align: center;
		margin-bottom: 24px;
	}

	.auth-heading h1 {
		font-size: 1.5rem;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.auth-heading p {
		font-size: 13px;
		color: #64748b;
		margin-top: 6px;
		line-height: 1.5;
	}

	.alert-warning {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 12px;
		color: #b45309;
		font-size: 12.5px;
		line-height: 1.5;
		margin-bottom: 20px;
	}

	.alert-form-error {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 12px;
		color: #991b1b;
		font-size: 13px;
		margin-bottom: 20px;
	}

	.alert-form-success {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 12px;
		color: #166534;
		font-size: 13px;
	}
	.alert-form-success strong { display: block; margin-bottom: 2px; }
	.alert-form-success p { margin: 0; font-size: 12.5px; color: #15803d; }

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label-clean {
		font-size: 12.5px;
		font-weight: 700;
		color: #334155;
	}

	.input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-prefix-icon {
		position: absolute;
		left: 14px;
		color: #94a3b8;
		pointer-events: none;
	}

	.clean-input {
		width: 100%;
		padding: 12px 16px 12px 42px;
		background: #f8fafc;
		border: 1.5px solid #e2e8f0;
		border-radius: 12px;
		color: #0f172a;
		font-size: 13.5px;
		outline: none;
		transition: all 150ms ease;
	}

	.clean-input:focus {
		border-color: #6366f1;
		background: #ffffff;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 13px 20px;
		background: linear-gradient(135deg, #4f46e5, #6366f1);
		color: #ffffff;
		border: none;
		border-radius: 12px;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
	}

	.submit-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #4338ca, #4f46e5);
		transform: translateY(-1px);
	}

	.submit-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		transform: none;
	}

	.auth-footer-links { text-align: center; margin-top: 4px; }

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #64748b;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		transition: color 150ms ease;
	}
	.back-link:hover { color: #4338ca; }

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
