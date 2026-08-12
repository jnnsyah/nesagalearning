<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>LOGIN — NLC NESAGA</title>
</svelte:head>

<div class="login-root">
	<!-- Left panel: Macro identity (desktop only) -->
	<div class="login-identity hide-mobile">
		<div class="login-identity__inner">
			<div class="login-identity__coords type-mono">
				<span>SYS/AUTH-PORTAL</span>
				<span class="text-muted">//</span>
				<span>TA 2026/2027</span>
			</div>

			<div class="login-identity__wordmark">NLC</div>

			<div class="login-identity__desc">
				<div class="login-identity__rule"></div>
				<p class="type-mono mt-2" style="font-size: 12px; color: var(--text-secondary); line-height: 1.7;">
					NESAGA LEARNING COMMUNITY<br />
					TEKNIK KOMPUTER DAN JARINGAN<br />
					SMK NESAGA — TA 2026/2027
				</p>
			</div>

			<div class="login-identity__bottom type-mono text-muted">
				<span>REV 2.0</span>
				<span style="margin: 0 8px;">///</span>
				<span>UNIT / NLC-01</span>
				<span style="margin: 0 8px;">///</span>
				<span>SECURE ACCESS</span>
			</div>
		</div>

		<!-- Crosshair corners -->
		<span class="crosshair crosshair--tl">+</span>
		<span class="crosshair crosshair--tr">+</span>
		<span class="crosshair crosshair--bl">+</span>
		<span class="crosshair crosshair--br">+</span>
	</div>

	<!-- Right panel: Auth terminal -->
	<div class="login-terminal">
		<div class="login-terminal__header">
			<div class="flex items-center gap-3">
				<div class="login-terminal__dot badge-live" style="width:8px;height:8px;background:var(--green-live);display:inline-block;"></div>
				<span class="type-mono" style="font-size: 10px;">TERMINAL AKTIF</span>
			</div>
			<span class="type-mono text-muted" style="font-size: 9px;">AUTH v2.0</span>
		</div>

		<div class="login-terminal__body">
			<!-- Mobile wordmark -->
			<div class="hide-desktop mb-4">
				<div class="type-mono text-muted mb-1" style="font-size: 9px;">SYS/AUTH-PORTAL</div>
				<div style="font-family: var(--font-macro); font-size: clamp(3rem, 15vw, 5rem); line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; color: var(--text-primary);">NLC</div>
				<hr class="rule mt-3" />
			</div>

			<div class="type-mono mb-4" style="font-size: 10px; color: var(--text-muted);">
				&gt;&gt;&gt; AUTENTIKASI DIPERLUKAN
			</div>

			{#if form?.error}
				<div class="alert-error mb-4">
					[!] {form.error}
				</div>
			{/if}

			<form method="POST" class="login-form">
				<div class="login-form__field">
					<label class="field-label" for="username">// USERNAME</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						value={form?.username ?? ''}
						placeholder="masukkan_username"
						class="field-input"
					/>
				</div>

				<div class="login-form__field">
					<label class="field-label" for="password">// PASSWORD</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
						placeholder="••••••••••••"
						class="field-input"
					/>
				</div>

				<div class="login-form__remember">
					<label class="flex items-center gap-2" style="cursor: pointer; user-select: none;">
						<input type="checkbox" name="rememberMe" class="field-checkbox" />
						<span class="type-mono" style="font-size: 10px; color: var(--text-secondary);">
							INGAT SESI DI PERANGKAT INI
						</span>
					</label>
					<span class="type-mono text-muted" style="font-size: 9px;">
						(MOBILE: 30 HARI / DESKTOP: 1 HARI)
					</span>
				</div>

				<button type="submit" class="btn-primary login-form__submit">
					&gt;&gt; AKSES SISTEM
				</button>
			</form>

			<hr class="rule mt-4" />
			<div class="type-mono text-muted mt-3" style="font-size: 9px; line-height: 1.8;">
				DEV CREDENTIALS:<br />
				admin / guru / mentor / siswa1<br />
				PASSWORD: password123
			</div>
		</div>

		<!-- Crosshair corners on terminal -->
		<span class="crosshair crosshair--tr" style="color: var(--text-muted);">+</span>
		<span class="crosshair crosshair--br" style="color: var(--text-muted);">+</span>
	</div>
</div>

<style>
	.login-root {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
	}

	/* Left identity panel */
	.login-identity {
		position: relative;
		flex: 1;
		background: var(--bg-inset);
		border-right: 1px solid var(--border-hard);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.login-identity__inner {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 32px;
	}

	.login-identity__coords {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 10px;
	}

	.login-identity__wordmark {
		font-family: var(--font-macro);
		font-size: clamp(8rem, 18vw, 18rem);
		line-height: 0.85;
		letter-spacing: -0.05em;
		text-transform: uppercase;
		color: var(--text-primary);
		/* Phosphor glow */
		text-shadow: 0 0 60px rgba(234, 234, 234, 0.08);
	}

	.login-identity__rule {
		width: 48px;
		height: 2px;
		background: var(--red);
		margin-bottom: 12px;
	}

	.login-identity__bottom {
		display: flex;
		align-items: center;
		font-size: 9px;
	}

	/* Right terminal panel */
	.login-terminal {
		position: relative;
		width: 100%;
		max-width: 460px;
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--border-hard);
	}

	@media (max-width: 767px) {
		.login-terminal {
			max-width: 100%;
			border-left: none;
		}
	}

	.login-terminal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 24px;
		border-bottom: 1px solid var(--border-hard);
		background: var(--bg-panel);
	}

	.login-terminal__body {
		flex: 1;
		padding: 32px 24px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.login-form__field {
		display: flex;
		flex-direction: column;
	}

	.login-form__remember {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.login-form__submit {
		margin-top: 4px;
	}

	/* Crosshair decoration */
	.crosshair {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-ghost);
		line-height: 1;
	}
	.crosshair--tl { top: 8px; left: 10px; }
	.crosshair--tr { top: 8px; right: 10px; }
	.crosshair--bl { bottom: 8px; left: 10px; }
	.crosshair--br { bottom: 8px; right: 10px; }
</style>
