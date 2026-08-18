<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isReadCompleted = $state(false);

	function toggleReadStatus() {
		isReadCompleted = !isReadCompleted;
		if (isReadCompleted) {
			toast.success('Materi telah ditandai selesai dibaca.');
		} else {
			toast.info('Status selesai dibaca dibatalkan.');
		}
	}
</script>

<svelte:head>
	<title>{data.materi.title} — Materi Pembelajaran</title>
</svelte:head>

<div class="content-area">
	<!-- Page Breadcrumb & Header -->
	<div class="header-card">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/siswa" class="bc-link">Dashboard</a>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
			<span class="bc-current">Materi Kurikulum</span>
		</nav>

		<div class="flex items-center gap-2 mb-2 flex-wrap">
			<span class="track-tag">{data.materi.trackTitle}</span>
			<span class="phase-tag">{data.materi.phaseTitle} &rsaquo; {data.materi.subPhaseTitle}</span>
		</div>

		<div class="flex items-start justify-between gap-4 flex-wrap">
			<div>
				<h1 class="page-title">{data.materi.title}</h1>
				<p class="page-sub">Pendalaman materi modul pembelajaran kurikulum Nesaga Learning Center.</p>
			</div>

			<button
				type="button"
				onclick={toggleReadStatus}
				class="btn-mark-read {isReadCompleted ? 'btn-completed' : ''}"
			>
				{#if isReadCompleted}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span>Selesai Dibaca</span>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					<span>Tandai Selesai Dibaca</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Embedded Slide / Material Attachment Card -->
	{#if data.sessionSlide?.materialUrl}
		<div class="slide-attachment-box mb-6">
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<div class="flex items-center gap-3">
					<div class="slide-icon">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					</div>
					<div>
						<h4 class="slide-title">Slide Presentasi PPT Pertemuan</h4>
						<p class="slide-sub">
							Lampiran berkas presentasi untuk sesi <strong>{data.sessionSlide.pertemuanTitle}</strong>
						</p>
					</div>
				</div>

				<a
					href={data.sessionSlide.materialUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="btn-download-slide"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					<span>Unduh Slide PPT</span>
				</a>
			</div>
		</div>
	{/if}

	<!-- Rich Text Body Content -->
	<article class="material-article">
		{#if data.materi.content}
			<div class="prose-content">
				{@html data.materi.content}
			</div>
		{:else}
			<div class="empty-content">
				<p>Isi materi pembelajaran sedang disusun oleh mentor/instruktur.</p>
			</div>
		{/if}
	</article>

	<!-- Footer Navigation prev & next -->
	<div class="navigation-footer">
		{#if data.prevMateri}
			<a href={`/siswa/materi/${data.prevMateri.id}`} class="btn-nav-prev">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="15 18 9 12 15 6" />
				</svg>
				<div class="text-left">
					<span class="nav-label">Materi Sebelumnya</span>
					<div class="nav-title">{data.prevMateri.title}</div>
				</div>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if data.nextMateri}
			<a href={`/siswa/materi/${data.nextMateri.id}`} class="btn-nav-next">
				<div class="text-right">
					<span class="nav-label">Materi Selanjutnya</span>
					<div class="nav-title">{data.nextMateri.title}</div>
				</div>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</a>
		{/if}
	</div>
</div>

<style>
	.content-area {
		padding: 24px 28px 40px;
		max-width: 1000px;
		margin: 0 auto;
	}

	.header-card {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 24px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 24px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 12px;
	}

	.bc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		text-decoration: none;
	}

	.bc-link:hover {
		color: var(--primary);
	}

	.bc-current {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		color: var(--primary);
	}

	.track-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: #4338ca;
		background: #e0e7ff;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.phase-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-inset);
		padding: 2px 8px;
		border-radius: 4px;
	}

	.page-title {
		font-family: var(--font-macro);
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.25;
		margin-bottom: 4px;
	}

	.page-sub {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.btn-mark-read {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 16px;
		border: 1px solid var(--border-hard);
		background: #ffffff;
		color: var(--text-primary);
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms ease;
		flex-shrink: 0;
	}

	.btn-mark-read:hover {
		border-color: var(--primary-border);
		background: var(--primary-light);
		color: var(--primary);
	}

	.btn-completed {
		background: #dcfce7 !important;
		color: #15803d !important;
		border-color: #86efac !important;
	}

	.slide-attachment-box {
		background: #f8fafc;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
	}

	.slide-icon {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		background: #e0e7ff;
		color: #4f46e5;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.slide-title {
		font-family: var(--font-macro);
		font-size: 14px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.slide-sub {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.btn-download-slide {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		background: #4f46e5;
		color: #ffffff;
		border-radius: 8px;
		font-family: var(--font-macro);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.btn-download-slide:hover {
		background: #4338ca;
	}

	.material-article {
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		padding: 28px;
		box-shadow: var(--shadow-sm);
		margin-bottom: 28px;
		line-height: 1.7;
	}

	.prose-content {
		font-size: 15px;
		color: #334155;
	}

	.prose-content :global(h1),
	.prose-content :global(h2),
	.prose-content :global(h3) {
		font-family: var(--font-macro);
		font-weight: 800;
		color: var(--text-primary);
		margin-top: 1.5em;
		margin-bottom: 0.5em;
	}

	.prose-content :global(p) {
		margin-bottom: 1em;
	}

	.prose-content :global(code) {
		font-family: var(--font-mono);
		font-size: 13.5px;
		background: #f1f5f9;
		color: #0f172a;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.prose-content :global(pre) {
		background: #0f172a;
		color: #f8fafc;
		padding: 16px;
		border-radius: 8px;
		overflow-x: auto;
		margin-bottom: 1.2em;
	}

	.empty-content {
		text-align: center;
		padding: 40px 20px;
		color: var(--text-muted);
		font-size: 14px;
	}

	.navigation-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.btn-nav-prev,
	.btn-nav-next {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 12px 18px;
		background: #ffffff;
		border: 1px solid var(--border-hard);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--text-primary);
		transition: all 150ms ease;
		max-width: 48%;
	}

	.btn-nav-prev:hover,
	.btn-nav-next:hover {
		border-color: var(--primary-border);
		background: var(--bg-inset);
	}

	.nav-label {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--text-muted);
		display: block;
	}

	.nav-title {
		font-family: var(--font-macro);
		font-size: 13px;
		font-weight: 800;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		.content-area {
			padding: 16px;
		}
		.navigation-footer {
			flex-direction: column;
			align-items: stretch;
		}
		.btn-nav-prev,
		.btn-nav-next {
			max-width: 100%;
		}
	}
</style>
