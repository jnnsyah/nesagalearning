<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);

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
	<title>Daftar Akun — Nesaga Learning Community</title>
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
		<!-- Top Navigation: Kembali Button -->
		<div class="auth-top-nav">
			<a href="/login" class="btn-back-clean">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				<span>Kembali ke Login</span>
			</a>
		</div>

		<!-- Brand header -->
		<div class="auth-brand">
			<div class="nlc-mark">NLC</div>
			<div class="nlc-tagline">Nesaga Learning Community</div>
			<div class="brand-chip">
				<span class="chip-dot"></span>
				Pendaftaran Siswa Baru
			</div>
		</div>

		<!-- Form header -->
		<div class="auth-heading">
			<h1>Buat Akun Baru</h1>
			<p>Lengkapi formulir di bawah untuk mendaftar portal pembelajaran.</p>
		</div>



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
			<!-- Nama Lengkap -->
			<div class="field-group">
				<label for="fullName" class="field-label-clean">Nama Lengkap</label>
				<div class="input-wrap">
					<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
					<input
						id="fullName"
						name="fullName"
						type="text"
						required
						value={form?.fullName ?? ''}
						placeholder="Masukkan nama lengkap Anda"
						class="clean-input"
					/>
				</div>
			</div>

			<!-- Username -->
			<div class="field-group">
				<label for="username" class="field-label-clean">Username Akun</label>
				<div class="input-wrap">
					<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="4"/>
						<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
					</svg>
					<input
						id="username"
						name="username"
						type="text"
						required
						value={form?.username ?? ''}
						placeholder="contoh: bima_sakti"
						class="clean-input"
					/>
				</div>
			</div>

			<!-- Email -->
			<div class="field-group">
				<label for="email" class="field-label-clean">Alamat Email Aktif</label>
				<div class="input-wrap">
					<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
						<polyline points="22,6 12,13 2,6"/>
					</svg>
					<input
						id="email"
						name="email"
						type="email"
						required
						value={form?.email ?? ''}
						placeholder="contoh: siswa@gmail.com"
						class="clean-input"
					/>
				</div>
			</div>

			<!-- Password -->
			<div class="field-group">
				<label for="password" class="field-label-clean">Kata Sandi</label>
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
						placeholder="Minimal 8 karakter"
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
					<div class="strength-meter-wrap mt-1">
						<div class="strength-bars">
							<div class="bar {passwordScore >= 1 ? 'bar-fill bar-red' : ''}"></div>
							<div class="bar {passwordScore >= 2 ? 'bar-fill bar-yellow' : ''}"></div>
							<div class="bar {passwordScore >= 3 ? 'bar-fill bar-green' : ''}"></div>
							<div class="bar {passwordScore >= 4 ? 'bar-fill bar-emerald' : ''}"></div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Konfirmasi Password -->
			<div class="field-group">
				<label for="confirmPassword" class="field-label-clean">Ulangi Kata Sandi</label>
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
						placeholder="Konfirmasi password Anda"
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
			</div>

			<button type="submit" class="submit-btn" disabled={isSubmitting || !hasMinLength || !isMatch}>
				{#if isSubmitting}
					<span class="spinner"></span>
					<span>Memproses Pendaftaran...</span>
				{:else}
					<span>Daftar Akun Sekarang</span>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="5" y1="12" x2="19" y2="12"/>
						<polyline points="12 5 19 12 12 19"/>
					</svg>
				{/if}
			</button>

			<div class="divider">
				<span class="divider-text">atau daftar dengan</span>
			</div>

			<a href="/login/google" class="google-btn">
				<svg class="google-icon" width="18" height="18" viewBox="0 0 24 24">
					<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
					<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
					<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
				</svg>
				<span>Daftar Cepat dengan Google</span>
			</a>

			<div class="auth-footer-links">
				<a href="/login" class="back-link">
					Sudah punya akun? <span class="text-indigo-600 font-bold underline">Login disini</span>
				</a>
			</div>
		</form>
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

	.auth-top-nav {
		display: flex;
		align-items: center;
		margin-bottom: 16px;
	}

	.btn-back-clean {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		background: rgba(241, 245, 249, 0.85);
		border: 1px solid #cbd5e1;
		border-radius: 9999px;
		color: #475569;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		transition: all 150ms ease;
	}

	.btn-back-clean:hover {
		background: #ffffff;
		color: #0f172a;
		border-color: #94a3b8;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
		transform: translateX(-2px);
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
		background: #10b981;
	}

	.auth-heading {
		text-align: center;
		margin-bottom: 24px;
	}

	.auth-heading h1 {
		font-size: 1.4rem;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.auth-heading p {
		font-size: 13px;
		color: #64748b;
		margin-top: 4px;
	}

	.google-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 11px;
		background: #ffffff;
		color: #1e293b;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		transition: all 150ms ease;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
	}
	.google-btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }

	.divider {
		display: flex;
		align-items: center;
		text-align: center;
		margin: 18px 0;
		color: #94a3b8;
		font-size: 12px;
	}
	.divider::before, .divider::after {
		content: '';
		flex: 1;
		border-bottom: 1px solid #e2e8f0;
	}
	.divider-text { padding: 0 10px; }

	.alert-form-error {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 12px;
		color: #991b1b;
		font-size: 13px;
		margin-bottom: 16px;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
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
		gap: 4px;
	}

	.strength-bars {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		height: 3.5px;
	}

	.bar { background: #e2e8f0; border-radius: 9999px; transition: all 200ms ease; }
	.bar-fill { height: 100%; }
	.bar-red { background: #ef4444; }
	.bar-yellow { background: #f59e0b; }
	.bar-green { background: #10b981; }
	.bar-emerald { background: #059669; }

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
		margin-top: 6px;
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

	.auth-footer-links { text-align: center; margin-top: 8px; }

	.back-link {
		color: #64748b;
		font-size: 13px;
		text-decoration: none;
	}
	.back-link:hover { color: #0f172a; }

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
