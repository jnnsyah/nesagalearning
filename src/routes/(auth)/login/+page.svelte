<script lang="ts">
	let { form } = $props();

	let showPassword = $state(false);

	function fillCreds(username: string) {
		const uInput = document.getElementById('username') as HTMLInputElement;
		const pInput = document.getElementById('password') as HTMLInputElement;
		if (uInput && pInput) {
			uInput.value = username;
			pInput.value = 'password123';
		}
	}

	function togglePassword() {
		showPassword = !showPassword;
		const input = document.getElementById('password') as HTMLInputElement;
		if (input) input.type = showPassword ? 'text' : 'password';
	}
</script>

<svelte:head>
	<title>Masuk — Nesaga Learning Community</title>
</svelte:head>

<div class="login-root">
	<!-- Animated gradient background -->
	<div class="gradient-bg" aria-hidden="true">
		<div class="blob blob-1"></div>
		<div class="blob blob-2"></div>
		<div class="blob blob-3"></div>
		<div class="blob blob-4"></div>
	</div>

	<!-- Login card -->
	<div class="login-card">
		<!-- Brand header -->
		<div class="login-brand">
			<div class="nlc-mark">NLC</div>
			<div class="nlc-tagline">Nesaga Learning Community</div>
			<div class="brand-chip">
				<span class="chip-dot"></span>
				TKJ SMK Nesaga · TA 2026/2027
			</div>
		</div>

		<!-- Form header -->
		<div class="login-heading">
			<h1>Selamat Datang</h1>
			<p>Masukkan kredensial akun Anda untuk masuk.</p>
		</div>

		{#if form?.error}
			<div class="alert-form-error">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				{form.error}
			</div>
		{/if}

		<form method="POST" class="login-form">
			<!-- Username -->
			<div class="field-group">
				<label for="username" class="field-label-clean">Username</label>
				<div class="input-wrap">
					<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					<input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						value={form?.username ?? ''}
						placeholder="Masukkan username akun"
						class="clean-input"
					/>
				</div>
			</div>

			<!-- Password -->
			<div class="field-group">
				<label for="password" class="field-label-clean">Kata Sandi</label>
				<div class="input-wrap">
					<svg class="input-prefix-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
					<input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
						placeholder="••••••••••••"
						class="clean-input"
					/>
					<button
						type="button"
						class="password-toggle"
						onclick={togglePassword}
						aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
					>
						{#if showPassword}
							<!-- Eye-off icon -->
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<!-- Eye icon -->
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<!-- Remember me -->
			<label class="remember-label">
				<input type="checkbox" name="rememberMe" class="field-checkbox" />
				<span>Ingat sesi di perangkat ini</span>
			</label>

			<button type="submit" class="submit-btn">
				Masuk
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
			</button>
		</form>

		<!-- Dev test helper -->
		<div class="dev-hint">
			<div class="dev-hint__header">
				<span class="badge badge-pending">AKUN UJI COBA</span>
				<span class="type-mono text-muted">password123</span>
			</div>
			<div class="dev-hint__roles">
				<button type="button" onclick={() => fillCreds('siswa1')} class="role-btn">Siswa</button>
				<button type="button" onclick={() => fillCreds('mentor')} class="role-btn">Mentor</button>
				<button type="button" onclick={() => fillCreds('guru')} class="role-btn">Guru</button>
				<button type="button" onclick={() => fillCreds('admin')} class="role-btn role-btn--admin">Admin</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── Root ── */
	.login-root {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		position: relative;
		overflow: hidden;
		background: #f0f4ff;
	}

	/* ── Animated gradient blobs ── */
	.gradient-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.55;
		animation: drift 12s ease-in-out infinite alternate;
	}

	.blob-1 {
		width: 600px;
		height: 600px;
		top: -15%;
		left: -10%;
		background: radial-gradient(circle, #c7d2fe, #818cf8);
		animation-duration: 14s;
		animation-delay: 0s;
	}

	.blob-2 {
		width: 480px;
		height: 480px;
		bottom: -15%;
		right: -10%;
		background: radial-gradient(circle, #99f6e4, #5eead4);
		animation-duration: 11s;
		animation-delay: -4s;
	}

	.blob-3 {
		width: 400px;
		height: 400px;
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: radial-gradient(circle, #fde68a, #fbbf24);
		animation-duration: 16s;
		animation-delay: -8s;
		opacity: 0.35;
	}

	.blob-4 {
		width: 350px;
		height: 350px;
		top: 10%;
		right: 5%;
		background: radial-gradient(circle, #ddd6fe, #a78bfa);
		animation-duration: 13s;
		animation-delay: -2s;
		opacity: 0.4;
	}

	@keyframes drift {
		0% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(40px, -30px) scale(1.06);
		}
		66% {
			transform: translate(-25px, 40px) scale(0.95);
		}
		100% {
			transform: translate(30px, 20px) scale(1.03);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.blob { animation: none; }
	}

	/* ── Card ── */
	.login-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 420px;
		background: rgba(255, 255, 255, 0.88);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.7);
		border-radius: 28px;
		padding: 44px 36px;
		box-shadow:
			0 4px 24px rgba(79, 70, 229, 0.08),
			0 24px 64px rgba(15, 23, 42, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	@media (max-width: 480px) {
		.login-card {
			padding: 32px 24px;
			border-radius: 22px;
		}
	}

	/* ── Brand ── */
	.login-brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		margin-bottom: 28px;
	}

	.nlc-mark {
		font-family: var(--font-macro);
		font-size: 3.5rem;
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
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 700;
		color: #334155;
		margin-bottom: 10px;
	}

	.brand-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 12px;
		border-radius: 9999px;
		background: rgba(79, 70, 229, 0.08);
		border: 1px solid rgba(79, 70, 229, 0.18);
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 700;
		color: #4338ca;
		letter-spacing: 0.02em;
	}

	.chip-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 7px rgba(16, 185, 129, 0.7);
	}

	/* ── Heading ── */
	.login-heading {
		margin-bottom: 22px;
	}

	.login-heading h1 {
		font-family: var(--font-macro);
		font-size: 1.5rem;
		font-weight: 800;
		color: #0f172a;
		letter-spacing: -0.02em;
		margin-bottom: 4px;
	}

	.login-heading p {
		font-size: 13px;
		color: #64748b;
		font-weight: 500;
	}

	/* ── Alert ── */
	.alert-form-error {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 12px;
		padding: 11px 14px;
		font-size: 13px;
		font-weight: 600;
		color: #dc2626;
		margin-bottom: 18px;
	}

	/* ── Form ── */
	.login-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.field-label-clean {
		font-size: 13px;
		font-weight: 700;
		color: #1e293b;
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
		flex-shrink: 0;
	}

	.clean-input {
		width: 100%;
		background: rgba(248, 250, 252, 0.9);
		border: 1.5px solid #e2e8f0;
		border-radius: 12px;
		font-family: var(--font-body);
		font-size: 14px;
		color: #0f172a;
		padding: 12px 44px 12px 42px;
		outline: none;
		transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
		-webkit-appearance: none;
	}

	.clean-input::placeholder {
		color: #cbd5e1;
	}

	.clean-input:focus {
		background: #ffffff;
		border-color: #6366f1;
		box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
	}

	/* Password toggle */
	.password-toggle {
		position: absolute;
		right: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
		transition: color 150ms ease, background 150ms ease;
		flex-shrink: 0;
	}

	.password-toggle:hover {
		color: #4f46e5;
		background: rgba(79, 70, 229, 0.08);
	}

	/* Remember */
	.remember-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
		font-size: 13px;
		font-weight: 600;
		color: #475569;
	}

	/* Submit */
	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%);
		border: none;
		border-radius: 12px;
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 700;
		color: #ffffff;
		padding: 13px 20px;
		cursor: pointer;
		box-shadow: 0 8px 24px -4px rgba(79, 70, 229, 0.45);
		transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
		margin-top: 4px;
	}

	.submit-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px -4px rgba(79, 70, 229, 0.55);
		background: linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #4f46e5 100%);
	}

	.submit-btn:active {
		transform: scale(0.98);
	}

	/* ── Dev hint ── */
	.dev-hint {
		margin-top: 20px;
		background: rgba(241, 245, 249, 0.8);
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 14px;
	}

	.dev-hint__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}

	.dev-hint__roles {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.role-btn {
		background: #ffffff;
		border: 1.5px solid #e2e8f0;
		border-radius: 9px;
		padding: 7px 4px;
		font-size: 12px;
		font-weight: 700;
		color: #334155;
		cursor: pointer;
		text-align: center;
		transition: all 150ms ease;
		font-family: var(--font-body);
	}

	.role-btn:hover {
		background: #e0e7ff;
		border-color: #a5b4fc;
		color: #3730a3;
		transform: translateY(-1px);
	}

	.role-btn--admin {
		border-color: #fca5a5;
		color: #dc2626;
	}

	.role-btn--admin:hover {
		background: #fee2e2;
		border-color: #f87171;
		color: #b91c1c;
	}
</style>
