<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// 6 Digit OTP array
	let digits = $state(['', '', '', '', '', '']);
	let fullCode = $derived(digits.join(''));

	let isSubmitting = $state(false);
	let isResending = $state(false);
	let cooldownSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function startCooldown(seconds = 60) {
		cooldownSeconds = seconds;
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (cooldownSeconds > 1) {
				cooldownSeconds--;
			} else {
				cooldownSeconds = 0;
				if (timerInterval) clearInterval(timerInterval);
			}
		}, 1000);
	}

	$effect(() => {
		if (form?.resendSuccess) {
			startCooldown(60);
		}
	});

	function handleInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const val = target.value.replace(/\D/g, '');

		if (val.length > 1) {
			// User menempelkan (paste) beberapa karakter sekaligus
			const pastedDigits = val.slice(0, 6).split('');
			pastedDigits.forEach((d, i) => {
				if (i < 6) digits[i] = d;
			});
			const lastIdx = Math.min(pastedDigits.length - 1, 5);
			const nextInput = document.getElementById(`digit-${lastIdx}`) as HTMLInputElement;
			if (nextInput) nextInput.focus();
		} else {
			digits[index] = val;
			if (val && index < 5) {
				const nextInput = document.getElementById(`digit-${index + 1}`) as HTMLInputElement;
				if (nextInput) nextInput.focus();
			}
		}
	}

	function handleKeyDown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !digits[index] && index > 0) {
			const prevInput = document.getElementById(`digit-${index - 1}`) as HTMLInputElement;
			if (prevInput) {
				prevInput.focus();
				digits[index - 1] = '';
			}
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pastedText = e.clipboardData?.getData('text') || '';
		const numericDigits = pastedText.replace(/\D/g, '').slice(0, 6).split('');
		numericDigits.forEach((d, i) => {
			if (i < 6) digits[i] = d;
		});
		const lastIdx = Math.min(numericDigits.length - 1, 5);
		const nextInput = document.getElementById(`digit-${lastIdx}`) as HTMLInputElement;
		if (nextInput) nextInput.focus();
	}
</script>

<svelte:head>
	<title>Verifikasi Kode Email — Nesaga Learning Community</title>
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
		<!-- Top Navigation: Kembali & Ubah Email Button -->
		<div class="auth-top-nav">
			<a href="/register" class="btn-back-clean">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				<span>Kembali & Ubah Email</span>
			</a>
		</div>

		<!-- Brand header -->
		<div class="auth-brand">
			<div class="nlc-mark">NLC</div>
			<div class="nlc-tagline">Nesaga Learning Community</div>
			<div class="brand-chip">
				<span class="chip-dot"></span>
				Verifikasi Email (OTP)
			</div>
		</div>

		<!-- Form header -->
		<div class="auth-heading">
			<h1>Masukkan Kode Verifikasi</h1>
			<p>
				Kami telah mengirimkan <strong>6 digit kode verifikasi</strong> ke alamat email:
				<br />
				<strong class="email-highlight">{data.email}</strong>
			</p>
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

		{#if form?.resendSuccess && form?.message}
			<div class="alert-form-success">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
					<polyline points="22 4 12 14.01 9 11.01"/>
				</svg>
				<span>{form.message}</span>
			</div>
		{/if}

		<form
			method="POST"
			action="?/verify"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
			class="auth-form"
		>
			<input type="hidden" name="userId" value={data.userId} />
			<input type="hidden" name="code" value={fullCode} />

			<!-- 6 Digit OTP Inputs (Mobile Numpad Keyboard Optimized) -->
			<div class="otp-inputs-grid" onpaste={handlePaste}>
				{#each digits as digit, i}
					<input
						id="digit-{i}"
						type="tel"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength="6"
						value={digit}
						oninput={(e) => handleInput(i, e)}
						onkeydown={(e) => handleKeyDown(i, e)}
						class="otp-box {digit ? 'otp-box--filled' : ''}"
						autocomplete="one-time-code"
					/>
				{/each}
			</div>

			<button type="submit" class="submit-btn" disabled={isSubmitting || fullCode.length !== 6}>
				{#if isSubmitting}
					<span class="spinner"></span>
					<span>Memverifikasi Kode...</span>
				{:else}
					<span>Verifikasi & Lanjutkan</span>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="5" y1="12" x2="19" y2="12"/>
						<polyline points="12 5 19 12 12 19"/>
					</svg>
				{/if}
			</button>
		</form>

		<!-- Resend OTP Action with Cooldown Timer -->
		<div class="resend-box mt-6">
			<span class="resend-text">Tidak menerima kode di inbox/spam?</span>
			<form
				method="POST"
				action="?/resend"
				use:enhance={() => {
					isResending = true;
					return async ({ update }) => {
						isResending = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="userId" value={data.userId} />
				<button type="submit" class="btn-resend" disabled={isResending || cooldownSeconds > 0}>
					{#if isResending}
						<span class="spinner-sm"></span>
						<span>Mengirim...</span>
					{:else if cooldownSeconds > 0}
						<span>Tunggu {cooldownSeconds}s sebelum kirim ulang</span>
					{:else}
						<span>Kirim Ulang Kode OTP</span>
					{/if}
				</button>
			</form>

			<div class="wrong-email-wrapper mt-4 pt-3 border-t border-slate-200/60 text-center">
				<span class="text-xs text-slate-500">Salah memasukkan alamat email?</span>
				<div class="mt-1">
					<a href="/register" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1">
						<span>Kembali ke Pendaftaran & Ubah Email</span>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</a>
				</div>
			</div>
		</div>
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
		max-width: 460px;
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
		.auth-card { padding: 32px 20px; border-radius: 22px; }
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

	.email-highlight {
		color: #4338ca;
		font-family: var(--font-mono, monospace);
		word-break: break-all;
	}

	.alert-form-error {
		display: flex;
		align-items: flex-start;
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
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 12px;
		color: #166534;
		font-size: 13px;
		margin-bottom: 20px;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* 6 Box OTP Grid (Fluid Mobile Spacing) */
	.otp-inputs-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 8px;
	}

	@media (max-width: 480px) {
		.otp-inputs-grid {
			gap: 6px;
		}
	}

	.otp-box {
		width: 100%;
		height: 56px;
		background: #f8fafc;
		border: 1.5px solid #cbd5e1;
		border-radius: 12px;
		color: #0f172a;
		font-family: var(--font-mono, monospace);
		font-size: 1.5rem;
		font-weight: 800;
		text-align: center;
		outline: none;
		transition: all 150ms ease;
		-webkit-appearance: none;
	}

	@media (max-width: 480px) {
		.otp-box {
			height: 50px;
			font-size: 1.3rem;
			border-radius: 10px;
		}
	}

	.otp-box:focus {
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
		background: #ffffff;
	}

	.otp-box--filled {
		border-color: #4f46e5;
		background: #e0e7ff;
		color: #3730a3;
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

	.resend-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding-top: 18px;
		border-top: 1px solid #e2e8f0;
		text-align: center;
	}

	.resend-text {
		font-size: 12.5px;
		color: #64748b;
	}

	.btn-resend {
		background: transparent;
		border: none;
		color: #4f46e5;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		text-decoration: underline;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		border-radius: 6px;
		transition: color 150ms ease;
	}

	.btn-resend:hover:not(:disabled) { color: #3730a3; }
	.btn-resend:disabled { opacity: 0.5; cursor: not-allowed; text-decoration: none; }

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}

	.spinner-sm {
		width: 13px;
		height: 13px;
		border: 2px solid rgba(79, 70, 229, 0.3);
		border-top-color: #4f46e5;
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
