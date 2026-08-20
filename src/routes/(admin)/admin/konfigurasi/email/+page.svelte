<script lang="ts">
	import { enhance } from '$app/forms';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	// ──── State ────
	let showForm = $state(false);
	let editingId = $state<number | null>(null);

	// Form fields
	let fLabel = $state('');
	let fSenderName = $state('');
	let fSenderEmail = $state('');
	let fProvider = $state('gmail');
	let fSmtpHost = $state('');
	let fSmtpPort = $state('587');
	let fSmtpUser = $state('');
	let fSmtpPass = $state('');

	// Test email
	let testEmail = $state('');
	let isTesting = $state(false);

	// Confirm delete
	let deleteTargetId = $state<number | null>(null);

	const providerOptions = [
		{ value: 'gmail', label: 'Gmail SMTP (App Password)' },
		{ value: 'smtp', label: 'Custom SMTP Server' },
		{ value: 'disabled', label: 'Nonaktifkan Email' }
	];

	// Sync form response → toast
	$effect(() => {
		if (form?.success && form?.message) {
			toast.success(form.message as string);
			showForm = false;
			editingId = null;
			resetForm();
		} else if (form?.error) {
			toast.error(form.error as string);
		}
	});

	function resetForm() {
		fLabel = '';
		fSenderName = '';
		fSenderEmail = '';
		fProvider = 'gmail';
		fSmtpHost = '';
		fSmtpPort = '587';
		fSmtpUser = '';
		fSmtpPass = '';
	}

	function openAddForm() {
		resetForm();
		editingId = null;
		showForm = true;
	}

	function openEditForm(cfg: (typeof data.configs)[0]) {
		fLabel = cfg.label;
		fSenderName = cfg.senderName;
		fSenderEmail = cfg.senderEmail;
		fProvider = cfg.provider;
		fSmtpHost = cfg.smtpHost ?? '';
		fSmtpPort = cfg.smtpPort ?? '587';
		fSmtpUser = cfg.smtpUser ?? '';
		fSmtpPass = ''; // password tidak pernah di-prefill (security)
		editingId = cfg.id;
		showForm = true;
	}
</script>

<svelte:head>
	<title>Pengaturan Email — Admin Console</title>
</svelte:head>

<div class="content-area">
	<!-- Header Card -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/admin" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<a href="/admin/email" class="bc-link">Manajemen Email</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Konfigurasi SMTP</span>
		</nav>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">Konfigurasi Server SMTP</h1>
				<p class="page-sub">
					Kelola akun email pengirim untuk notifikasi sistem dan reset password. Hanya <strong>1 konfigurasi aktif</strong> yang digunakan oleh sistem.
				</p>
			</div>
			<div class="flex items-center gap-2.5 flex-wrap">
				<a href="/admin/email" class="btn btn-secondary">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
						<polyline points="22,6 12,13 2,6"/>
					</svg>
					Outbox Log
				</a>
				<button type="button" class="btn btn-primary" onclick={openAddForm}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					Tambah Konfigurasi
				</button>
			</div>
		</div>

		<!-- Quick System Overview Pills -->
		<div class="system-overview-grid mt-5">
			<div class="overview-pill">
				<span class="overview-label">Total Konfigurasi:</span>
				<strong class="overview-val">{data.configs.length} Akun</strong>
			</div>
			<div class="overview-pill">
				<span class="overview-label">Pengirim Aktif Saat Ini:</span>
				{#if data.configs.some((c) => c.isActive)}
					{@const activeCfg = data.configs.find((c) => c.isActive)}
					<span class="active-sender-pill">
						<span class="active-dot"></span>
						<strong>{activeCfg?.senderEmail}</strong> ({activeCfg?.provider.toUpperCase()})
					</span>
				{:else}
					<span class="inactive-sender-pill">Belum Ada Pengirim Aktif</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Interactive Setup Guide Banner -->
	<div class="guide-banner">
		<div class="guide-icon-wrap">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
				<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
				<polyline points="22,6 12,13 2,6"/>
			</svg>
		</div>
		<div class="guide-body">
			<h3 class="guide-title">Panduan Cepat Setup Gmail SMTP</h3>
			<div class="guide-steps">
				<div class="guide-step">
					<span class="step-num">1</span>
					<span>Aktifkan <strong>2-Step Verification</strong> di Akun Google pengirim.</span>
				</div>
				<div class="guide-step">
					<span class="step-num">2</span>
					<span>Buka <strong>Google Account &rarr; Security &rarr; App Passwords</strong> dan buat password aplikasi baru.</span>
				</div>
				<div class="guide-step">
					<span class="step-num">3</span>
					<span>Masukkan 16 karakter App Password tersebut ke dalam form konfigurasi di bawah.</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Form Tambah / Edit Konfigurasi -->
	{#if showForm}
		<div class="card form-card">
			<div class="card-header">
				<div class="flex items-center gap-2.5">
					<div class="form-header-icon">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
						</svg>
					</div>
					<div>
						<h2 class="card-title">{editingId ? 'Edit Konfigurasi Email' : 'Tambah Konfigurasi Email Baru'}</h2>
						<p class="card-subtitle">Isi rincian akun email pengirim & kredensial SMTP di bawah ini</p>
					</div>
				</div>
				<button type="button" class="btn-icon" onclick={() => { showForm = false; resetForm(); }} title="Tutup Form">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			<form method="POST" action="?/save" use:enhance class="space-y-6">
				{#if editingId}
					<input type="hidden" name="id" value={editingId} />
				{/if}

				<!-- Section 1: Identitas Email -->
				<div class="form-section">
					<h3 class="form-section-title">1. Identitas Pengirim & Provider</h3>
					<div class="form-grid">
						<TextInput
							label="Label Konfigurasi"
							name="label"
							bind:value={fLabel}
							placeholder="contoh: Email Utama Notifikasi"
							required
							hint="Nama pengenal internal untuk konfigurasi ini"
						/>
						<TextInput
							label="Nama Display Pengirim"
							name="senderName"
							bind:value={fSenderName}
							placeholder="contoh: NLC System"
							required
							hint="Nama yang muncul di inbox penerima (From Name)"
						/>
						<TextInput
							label="Email Alamat Pengirim"
							name="senderEmail"
							type="email"
							bind:value={fSenderEmail}
							placeholder="contoh: admin.nlc@gmail.com"
							required
							hint="Email resmi pengirim (From Email)"
						/>
						<div>
							<CustomSelect
								label="Provider Email"
								name="provider"
								options={providerOptions}
								bind:value={fProvider}
							/>
						</div>
					</div>
				</div>

				<!-- Section 2: Kredensial SMTP -->
				{#if fProvider !== 'disabled'}
					<div class="form-section border-t border-slate-200 pt-5">
						<h3 class="form-section-title">2. Kredensial Authentikasi SMTP</h3>
						<div class="form-grid">
							<TextInput
								label="SMTP User (Email Login)"
								name="smtpUser"
								bind:value={fSmtpUser}
								placeholder="contoh: admin.nlc@gmail.com"
								hint="Biasanya sama dengan Email Alamat Pengirim"
							/>
							<TextInput
								label="SMTP Password / App Password"
								name="smtpPass"
								type="password"
								bind:value={fSmtpPass}
								placeholder={editingId ? '(Biarkan kosong jika tidak ingin mengubah)' : 'Masukkan App Password 16 karakter'}
								hint={fProvider === 'gmail' ? 'Wajib menggunakan Google App Password (bukan password login biasa)' : 'Password akun SMTP'}
							/>

							{#if fProvider === 'smtp'}
								<TextInput
									label="SMTP Hostname"
									name="smtpHost"
									bind:value={fSmtpHost}
									placeholder="contoh: smtp.gmail.com atau smtp.mailtrap.io"
									hint="Server host pengirim email"
								/>
								<TextInput
									label="SMTP Port"
									name="smtpPort"
									bind:value={fSmtpPort}
									placeholder="587 (TLS) atau 465 (SSL)"
									hint="Port SMTP (default: 587 untuk TLS)"
								/>
							{:else if fProvider === 'gmail'}
								<input type="hidden" name="smtpHost" value="smtp.gmail.com" />
								<input type="hidden" name="smtpPort" value="587" />
							{/if}
						</div>
					</div>
				{/if}

				<div class="form-actions pt-2 border-t border-slate-200">
					<button type="button" class="btn btn-secondary" onclick={() => { showForm = false; resetForm(); }}>
						Batal
					</button>
					<button type="submit" class="btn btn-primary">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{editingId ? 'Simpan Perubahan' : 'Tambah Konfigurasi'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Daftar Konfigurasi Cards -->
	<div class="configs-list">
		{#if data.configs.length === 0}
			<div class="empty-card">
				<div class="empty-icon-wrap">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
						<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
					</svg>
				</div>
				<h3 class="empty-title">Belum Ada Konfigurasi Email</h3>
				<p class="empty-sub">Tambah akun email pengirim untuk mengaktifkan fitur notifikasi dan reset password bagi pengguna.</p>
				<button type="button" class="btn btn-primary mt-4" onclick={openAddForm}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					Tambah Konfigurasi Pertama
				</button>
			</div>
		{:else}
			{#each data.configs as cfg}
				<div class="config-card {cfg.isActive ? 'config-card--active' : ''}">
					<div class="config-card-header">
						<div class="config-card-info">
							<div class="config-label-row">
								<h3 class="config-label">{cfg.label}</h3>
								{#if cfg.isActive}
									<span class="badge-active">
										<span class="active-dot"></span>
										PENGIRIM AKTIF
									</span>
								{:else}
									<span class="badge-inactive">NONAKTIF</span>
								{/if}
							</div>
							<div class="config-meta">
								<span class="config-email">
									<strong>{cfg.senderName}</strong> &lt;{cfg.senderEmail}&gt;
								</span>
								<span class="config-sep">•</span>
								<span class="config-provider">
									{#if cfg.provider === 'gmail'}
										<span class="provider-pill provider-gmail">Gmail SMTP</span>
									{:else if cfg.provider === 'smtp'}
										<span class="provider-pill provider-smtp">Custom SMTP ({cfg.smtpHost}:{cfg.smtpPort})</span>
									{:else}
										<span class="provider-pill provider-disabled">Disabled</span>
									{/if}
								</span>
							</div>
						</div>

						<div class="config-actions">
							{#if !cfg.isActive && cfg.provider !== 'disabled'}
								<form method="POST" action="?/activate" use:enhance>
									<input type="hidden" name="id" value={cfg.id} />
									<button type="submit" class="btn btn-success-outline btn-sm" title="Jadikan pengirim email utama">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<polyline points="20 6 9 17 4 12" />
										</svg>
										Aktifkan
									</button>
								</form>
							{/if}
							<button type="button" class="btn btn-secondary btn-sm" onclick={() => openEditForm(cfg)}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
								</svg>
								Edit
							</button>
							<button type="button" class="btn btn-danger-outline btn-sm" onclick={() => (deleteTargetId = cfg.id)}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
								</svg>
								Hapus
							</button>
						</div>
					</div>

					<!-- Test Kirim Email Section (Hanya untuk Konfigurasi Aktif) -->
					{#if cfg.isActive}
						<div class="test-email-section">
							<div class="test-section-header">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2">
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
									<polyline points="22 4 12 14.01 9 11.01"/>
								</svg>
								<span>Uji Coba Pengiriman Email Live</span>
							</div>

							<form
								method="POST"
								action="?/test"
								use:enhance={() => {
									isTesting = true;
									return async ({ update }) => {
										isTesting = false;
										await update();
									};
								}}
								class="test-email-form"
							>
								<div class="flex-1 min-w-[240px]">
									<TextInput
										label=""
										name="toEmail"
										type="email"
										bind:value={testEmail}
										placeholder="Masukkan email penerima tes..."
										required
									/>
								</div>
								<button type="submit" class="btn btn-test-submit" disabled={isTesting || !testEmail}>
									{#if isTesting}
										<span class="spinner"></span>
										<span>Mengirim...</span>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
										</svg>
										<span>Kirim Email Uji Coba</span>
									{/if}
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Modal Konfirmasi Hapus -->
<ConfirmModal
	open={deleteTargetId !== null}
	title="Hapus Konfigurasi Email"
	message="Apakah Anda yakin ingin menghapus konfigurasi email ini? Tindakan ini tidak dapat dibatalkan."
	confirmText="Hapus"
	variant="danger"
	onconfirm={async () => {
		const formNode = document.createElement('form');
		formNode.method = 'POST';
		formNode.action = '?/delete';
		const inputNode = document.createElement('input');
		inputNode.name = 'id';
		inputNode.value = String(deleteTargetId);
		formNode.appendChild(inputNode);
		document.body.appendChild(formNode);
		formNode.submit();
	}}
	oncancel={() => (deleteTargetId = null)}
/>

<style>
	.content-area {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 24px;
		width: 100%;
		max-width: 100%;
	}

	@media (max-width: 640px) {
		.content-area { padding: 16px; }
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 16px;
		font-size: 12.5px;
		color: var(--text-muted);
	}
	.bc-link { color: var(--primary); text-decoration: none; font-weight: 600; }
	.bc-link:hover { text-decoration: underline; }
	.bc-current { color: var(--text-secondary); font-weight: 600; }

	.page-title {
		font-family: var(--font-macro);
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.page-sub { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }

	/* System Overview Pills */
	.system-overview-grid {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding-top: 14px;
		border-top: 1px solid var(--border-hard);
	}

	.overview-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 12px;
	}

	.overview-label {
		color: #64748b;
		font-family: var(--font-macro);
		font-weight: 700;
	}

	.overview-val {
		color: #0f172a;
		font-weight: 800;
	}

	.active-sender-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #15803d;
		font-family: var(--font-mono);
		font-size: 11.5px;
	}

	.inactive-sender-pill {
		color: #b91c1c;
		font-weight: 700;
		font-size: 11.5px;
	}

	/* Interactive Setup Guide Banner */
	.guide-banner {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 18px 20px;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.03);
	}

	.guide-icon-wrap {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: #e0f2fe;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.guide-body { flex: 1; min-width: 0; }

	.guide-title {
		font-family: var(--font-macro);
		font-size: 13.5px;
		font-weight: 800;
		color: #0369a1;
		margin: 0 0 8px 0;
	}

	.guide-steps {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.guide-step {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		color: #0c4a6e;
	}

	.step-num {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #0284c7;
		color: #ffffff;
		font-size: 10px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Form Card & Sections */
	.card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg, 12px);
		padding: 24px;
		box-shadow: var(--shadow-sm);
	}

	.form-card {
		border-color: #cbd5e1;
		box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.06));
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-hard);
	}

	.form-header-icon {
		width: 36px;
		height: 36px;
		border-radius: 9px;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-title {
		font-family: var(--font-macro);
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
	}

	.card-subtitle {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.form-section-title {
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 800;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin: 0;
	}

	.btn-icon {
		width: 32px;
		height: 32px;
		border: 1px solid var(--border-hard);
		border-radius: 8px;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--text-secondary);
		transition: all 150ms ease;
	}
	.btn-icon:hover { background: #f1f5f9; color: var(--text-primary); }

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	/* Config Cards */
	.configs-list { display: flex; flex-direction: column; gap: 14px; }

	.config-card {
		background: #ffffff;
		border: 1.5px solid #e2e8f0;
		border-radius: 12px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.04);
		transition: all 150ms ease;
	}

	.config-card:hover {
		border-color: #cbd5e1;
	}

	.config-card--active {
		border-color: #86efac !important;
		background: #f0fdf4;
		box-shadow: 0 4px 12px rgba(22, 163, 74, 0.08);
	}

	.config-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.config-label-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 6px;
	}

	.config-label {
		font-family: var(--font-macro);
		font-size: 15px;
		font-weight: 800;
		color: #0f172a;
		margin: 0;
	}

	.badge-active {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 9px;
		background: #dcfce7;
		color: #166534;
		border: 1px solid #86efac;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		font-weight: 800;
	}

	.badge-inactive {
		display: inline-flex;
		align-items: center;
		padding: 3px 8px;
		background: #f1f5f9;
		color: #64748b;
		border: 1px solid #cbd5e1;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
	}

	.active-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #16a34a;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.config-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		font-size: 13px;
		color: #475569;
	}

	.config-email { font-family: var(--font-mono); }
	.config-sep { color: #cbd5e1; }

	.provider-pill {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 6px;
		font-family: var(--font-macro);
		font-size: 11px;
		font-weight: 700;
	}

	.provider-gmail { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
	.provider-smtp { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
	.provider-disabled { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

	.config-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	/* Test Email Section */
	.test-email-section {
		margin-top: 18px;
		padding-top: 16px;
		border-top: 1.5px dashed #bbf7d0;
	}

	.test-section-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 800;
		color: #166534;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 10px;
	}

	.test-email-form {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		flex-wrap: wrap;
	}

	.btn-test-submit {
		background: #166534;
		color: #ffffff;
		border: 1px solid #14532d;
		padding: 10px 16px;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.btn-test-submit:hover:not(:disabled) {
		background: #14532d;
	}

	/* Empty State */
	.empty-card {
		text-align: center;
		padding: 52px 24px;
		background: #ffffff;
		border: 1.5px dashed #cbd5e1;
		border-radius: 14px;
	}

	.empty-icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		background: #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 14px;
	}

	.empty-title {
		font-family: var(--font-macro);
		font-size: 16px;
		font-weight: 800;
		color: #1e293b;
		margin: 0 0 6px 0;
	}
	.empty-sub { font-size: 13px; color: #64748b; margin: 0; max-width: 440px; margin: 0 auto; line-height: 1.5; }

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 9px 18px;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 150ms ease;
	}
	.btn-sm { padding: 7px 13px; font-size: 12px; }

	.btn-primary { background: var(--primary); color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
	.btn-primary:hover:not(:disabled) { background: var(--primary-hover, #4338ca); }

	.btn-secondary {
		background: #ffffff;
		color: var(--text-secondary);
		border-color: var(--border-hard);
	}
	.btn-secondary:hover:not(:disabled) { background: #f1f5f9; color: var(--text-primary); }

	.btn-success-outline {
		background: #ffffff;
		color: #166534;
		border-color: #86efac;
	}
	.btn-success-outline:hover:not(:disabled) { background: #dcfce7; }

	.btn-danger-outline {
		background: #ffffff;
		color: #b91c1c;
		border-color: #fca5a5;
	}
	.btn-danger-outline:hover:not(:disabled) { background: #fee2e2; }

	.btn:disabled { opacity: 0.55; cursor: not-allowed; }

	.spinner {
		width: 13px;
		height: 13px;
		border: 2px solid rgba(255,255,255,0.4);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
