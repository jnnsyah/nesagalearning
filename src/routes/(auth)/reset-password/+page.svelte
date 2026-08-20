<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);

	// Indikator Kekuatan Password
	let hasMinLength = $derived(password.length >= 8);
	let hasNumber = $derived(/\d/.test(password));
	let hasLetter = $derived(/[a-zA-Z]/.test(password));
	let isMatch = $derived(password.length > 0 && password === confirmPassword);

	let passwordScore = $derived.by(() => {
		let score = 0;
		if (hasMinLength) score++;
		if (hasNumber) score++;
		if (hasLetter) score++;
		if (/[^a-zA-Z0-9]/.test(password)) score++;
		return score;
	});
</script>

<svelte:head>
	<title>Reset Password — Nesaga Learning Community</title>
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
				Pembaruan Kata Sandi
			</div>
		</div>

		<!-- Form header -->
		<div class="auth-heading">
			<h1>Buat Password Baru</h1>
			<p>Masukkan password baru yang aman untuk akun Anda.</p>
		</div>

		{#if data.invalidToken}
			<div class="alert-form-error">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="8" x2="12" y2="12"/>
					<line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<span>{data.error}</span>
			</div>

			<div class="actions-stack mt-4">
				<a href="/forgot-password" class="submit-btn">
					<span>Minta Tautan Reset Baru</span>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="5" y1="12" x2="19" y2="12"/>
						<polyline points="12 5 19 12 12 19"/>
					</svg>
				</a>
				<div class="text-center mt-3">
					<a href="/login" class="back-link">Kembali ke Halaman Login</a>
				</div>
			</div>
		{:else}
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
				<input type="hidden" name="token" value={data.token} />

				<!-- Password Baru -->
				<div class="field-group">
					<label for="password" class="field-label-clean">Password Baru</label>
					<div class="input-wrap">
						<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2"/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
						</svg>
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							required
							bind:value={password}
							placeholder="Masukkan minimal 8 karakter"
							class="clean-input"
						/>
						<button
							type="button"
							class="password-toggle"
							onclick={() => (showPassword = !showPassword)}
							aria-label="Toggle password"
						>
							{#if showPassword}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
									<line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
									<circle cx="12" cy="12" r="3"/>
								</svg>
							{/if}
						</button>
					</div>

					<!-- Password Strength Indicator -->
					{#if password.length > 0}
						<div class="strength-meter-wrap mt-1.5">
							<div class="strength-bars">
								<div class="bar {passwordScore >= 1 ? 'bar-fill bar-red' : ''}"></div>
								<div class="bar {passwordScore >= 2 ? 'bar-fill bar-yellow' : ''}"></div>
								<div class="bar {passwordScore >= 3 ? 'bar-fill bar-green' : ''}"></div>
								<div class="bar {passwordScore >= 4 ? 'bar-fill bar-emerald' : ''}"></div>
							</div>
							<div class="strength-checklist">
								<span class={hasMinLength ? 'check-pass' : 'check-fail'}>✓ Min. 8 Karakter</span>
								<span class={hasLetter && hasNumber ? 'check-pass' : 'check-fail'}>✓ Huruf & Angka</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Konfirmasi Password -->
				<div class="field-group">
					<label for="confirmPassword" class="field-label-clean">Konfirmasi Password Baru</label>
					<div class="input-wrap">
						<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							required
							bind:value={confirmPassword}
							placeholder="Ulangi password baru Anda"
							class="clean-input {confirmPassword.length > 0 ? (isMatch ? 'input-match' : 'input-mismatch') : ''}"
						/>
						<button
							type="button"
							class="password-toggle"
							onclick={() => (showConfirmPassword = !showConfirmPassword)}
							aria-label="Toggle confirm password"
						>
							{#if showConfirmPassword}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
									<line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
									<circle cx="12" cy="12" r="3"/>
								</svg>
							{/if}
						</button>
					</div>
					{#if confirmPassword.length > 0}
						<div class="match-hint {isMatch ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}">
							{isMatch ? '✓ Password cocok' : '✗ Password tidak cocok'}
						</div>
					{/if}
				</div>

				<button type="submit" class="submit-btn" disabled={isSubmitting || !hasMinLength || !isMatch}>
					{#if isSubmitting}
						<span class="spinner"></span>
						<span>Memperbarui Password...</span>
					{:else}
						<span>Simpan Password Baru</span>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
					{/if}
				</button>
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
		padding: 12px 42px 12px 42px;
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

	.input-match { border-color: #10b981 !important; }
	.input-mismatch { border-color: #ef4444 !important; }

	.password-toggle {
		position: absolute;
		right: 12px;
		background: transparent;
		border: none;
		color: #94a3b8;
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.password-toggle:hover { color: #334155; }

	.strength-meter-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.strength-bars {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		height: 4px;
	}

	.bar { background: #e2e8f0; border-radius: 9999px; transition: all 200ms ease; }
	.bar-fill { height: 100%; }
	.bar-red { background: #ef4444; }
	.bar-yellow { background: #f59e0b; }
	.bar-green { background: #10b981; }
	.bar-emerald { background: #059669; }

	.strength-checklist {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 11.5px;
	}

	.check-pass { color: #16a34a; font-weight: 700; }
	.check-fail { color: #94a3b8; }

	.match-hint { font-size: 12px; margin-top: 2px; }

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

	.back-link {
		color: #64748b;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	.back-link:hover { color: #4338ca; text-decoration: underline; }

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
