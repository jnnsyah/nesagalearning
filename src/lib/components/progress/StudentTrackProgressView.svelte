<script lang="ts">
	interface SubPhaseProgressItem {
		subPhaseId: number;
		subPhaseTitle: string;
		isCompleted: boolean;
		totalSessions: number;
		completedSessions: number;
		totalTasks: number;
		approvedTasks: number;
	}

	interface PhaseProgressItem {
		phaseId?: number;
		phaseTitle: string;
		completedSubPhases: number;
		totalSubPhases: number;
		progressPercentage: number;
		subPhases?: SubPhaseProgressItem[];
	}

	interface TrackInfo {
		trackTitle?: string;
		trackDescription?: string;
		tingkatName?: string;
	}

	interface ActiveMembership {
		kelasName?: string;
		tahunAjaranName?: string;
	}

	interface SummaryMetrics {
		totalSessions?: number;
		totalTasks?: number;
	}

	let {
		trackInfo = null,
		activeMembership = null,
		phaseProgressList = [],
		summary = {},
		allowCatalogMode = true,
		initialViewMode = 'catalog',
		onViewModeChange
	}: {
		trackInfo?: TrackInfo | null;
		activeMembership?: ActiveMembership | null;
		phaseProgressList?: PhaseProgressItem[];
		summary?: SummaryMetrics;
		allowCatalogMode?: boolean;
		initialViewMode?: 'catalog' | 'detail';
		onViewModeChange?: (mode: 'catalog' | 'detail') => void;
	} = $props();

	let trackViewMode = $state<'catalog' | 'detail'>(initialViewMode);

	// Sync when initialViewMode prop changes from parent
	$effect(() => {
		trackViewMode = initialViewMode;
	});

	function setViewMode(mode: 'catalog' | 'detail') {
		trackViewMode = mode;
		onViewModeChange?.(mode);
	}

	// Calculate overall Track Pembelajaran completion percentage
	let totalSubPhasesCount = $derived(
		phaseProgressList.reduce((acc, p) => acc + (p.totalSubPhases || 0), 0)
	);
	let completedSubPhasesCount = $derived(
		phaseProgressList.reduce((acc, p) => acc + (p.completedSubPhases || 0), 0)
	);
	let overallTrackProgress = $derived(
		totalSubPhasesCount > 0
			? Math.round((completedSubPhasesCount / totalSubPhasesCount) * 100)
			: 0
	);
</script>

<div class="tab-section">
	{#if allowCatalogMode && trackViewMode === 'catalog'}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 1: KATALOG KARTU TRACK BELAJAR UTAMA
		     ══════════════════════════════════════════════════════════ -->
		<div class="section-header">
			<div>
				<h2 class="section-title">Katalog Track Pembelajaran Anda</h2>
				<p class="section-sub">Ringkasan alur track pembelajaran aktif yang sedang Anda ikuti pada kelas saat ini.</p>
			</div>
		</div>

		{#if phaseProgressList.length === 0}
			<div class="empty-card">
				<div class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
					</svg>
				</div>
				<div class="empty-title">Belum Ada Track Pembelajaran Dipublikasikan</div>
				<div class="empty-sub">Alur track pembelajaran untuk kelas Anda belum dikonfigurasi atau belum dimulai oleh Guru.</div>
			</div>
		{:else}
			<div class="track-catalog-container">
				<div class="track-main-card">
					<!-- Header Track Card -->
					<div class="track-card-header">
						<div class="track-card-tags">
							{#if trackInfo?.tingkatName}
								<span class="badge badge-grade">{trackInfo.tingkatName}</span>
							{/if}
							<span class="badge badge-approved">AKTIF (Track Kelas Anda)</span>
						</div>

						<h3 class="track-card-title">
							{trackInfo?.trackTitle || 'Track Pembelajaran Kelas'}
						</h3>
						<p class="track-card-desc">
							{trackInfo?.trackDescription || 'Alur pembelajaran terstruktur untuk pengembangan kompetensi dan praktikum siswa.'}
						</p>
					</div>

					<!-- Body Track Card -->
					<div class="track-card-body">
						{#if activeMembership?.kelasName}
							<div class="rombel-info-line">
								<span class="rombel-label">Rombel Kelas:</span>
								<span class="badge badge-active-class">{activeMembership.kelasName}</span>
								{#if activeMembership.tahunAjaranName}
									<span class="type-sub">({activeMembership.tahunAjaranName})</span>
								{/if}
							</div>
						{/if}

						<!-- Mini Metrics Grid -->
						<div class="metrics-mini-grid">
							<div class="mini-stat-item">
								<div class="mini-stat-val">{phaseProgressList.length}</div>
								<div class="mini-stat-lbl">Phase</div>
							</div>
							<div class="mini-stat-item">
								<div class="mini-stat-val">{totalSubPhasesCount}</div>
								<div class="mini-stat-lbl">SubPhase</div>
							</div>
							<div class="mini-stat-item">
								<div class="mini-stat-val">{summary.totalSessions ?? 0}</div>
								<div class="mini-stat-lbl">Sesi</div>
							</div>
							<div class="mini-stat-item">
								<div class="mini-stat-val">{summary.totalTasks ?? 0}</div>
								<div class="mini-stat-lbl">Tugas</div>
							</div>
						</div>

						<!-- Overall Ketercapaian Progress -->
						<div class="progress-box-card">
							<div class="progress-box-top">
								<span class="progress-box-lbl">Ketercapaian Progress Belajar Anda</span>
								<span class="progress-box-val">{overallTrackProgress}%</span>
							</div>
							<div class="progress-box-bar-bg">
								<div class="progress-box-bar-fill" style="width: {overallTrackProgress}%;"></div>
							</div>
						</div>
					</div>

					<!-- Footer Action Button -->
					<div class="track-card-footer">
						<button
							type="button"
							class="btn-open-track"
							onclick={() => setViewMode('detail')}
						>
							<span>Lihat Detail Modul</span>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>
						</button>
					</div>
				</div>
			</div>
		{/if}

	{:else}
		<!-- ══════════════════════════════════════════════════════════
		     TIER 2: DETAIL BREAKDOWN VIEW (Rincian Fase & Sub-fase)
		     ══════════════════════════════════════════════════════════ -->
		{#if allowCatalogMode}
			<div class="tier-nav-bar">
				<button
					type="button"
					class="btn-back-catalog"
					onclick={() => setViewMode('catalog')}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6" /></svg>
					<span>Kembali ke Katalog Track Belajar</span>
				</button>
			</div>
		{/if}

		<div class="section-header">
			<div>
				<h2 class="section-title">{trackInfo?.trackTitle || 'Detail Modul Track Pembelajaran'}</h2>
				<p class="section-sub">Detail progres ketercapaian pada setiap fase dan sub-fase pembelajaran.</p>
			</div>

			<div class="overall-progress-box">
				<div class="progress-info-row">
					<span class="progress-label">Kemajuan Total</span>
					<span class="progress-val">{overallTrackProgress}%</span>
				</div>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill" style="width: {overallTrackProgress}%;"></div>
				</div>
			</div>
		</div>

		{#if phaseProgressList.length === 0}
			<div class="empty-card">
				<div class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
					</svg>
				</div>
				<div class="empty-title">Belum Ada Fase Pembelajaran</div>
				<div class="empty-sub">Fase track pembelajaran belum dikonfigurasi.</div>
			</div>
		{:else}
			<div class="phases-grid">
				{#each phaseProgressList as phaseItem, phaseIndex}
					<div class="phase-card">
						<div class="phase-card-header">
							<div class="phase-title-wrap">
								<span class="badge badge-grade">Fase {phaseIndex + 1}</span>
								<h3 class="phase-title">{phaseItem.phaseTitle}</h3>
								<span class="phase-meta">• {phaseItem.completedSubPhases}/{phaseItem.totalSubPhases} Sub-fase Selesai</span>
							</div>
							<span class="phase-badge">{phaseItem.progressPercentage}%</span>
						</div>

						<div class="phase-bar-bg">
							<div class="phase-bar-fill" style="width: {phaseItem.progressPercentage}%;"></div>
						</div>

						{#if phaseItem.subPhases && phaseItem.subPhases.length > 0}
							<div class="subphase-stack">
								{#each phaseItem.subPhases as subItem}
									<div class="subphase-card">
										<div class="subphase-icon {subItem.isCompleted ? 'subphase-icon--done' : ''}">
											{#if subItem.isCompleted}
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
											{:else}
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg>
											{/if}
										</div>

										<div class="subphase-info">
											<div class="subphase-name">{subItem.subPhaseTitle}</div>
											<div class="subphase-meta-row">
												{#if subItem.totalSessions === 0 && subItem.totalTasks === 0}
													<span class="meta-pill meta-pill-unstarted">Belum Dimulai</span>
												{:else}
													{#if subItem.totalSessions > 0}
														<span class="meta-pill">
															<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
															<span>{subItem.completedSessions}/{subItem.totalSessions} Sesi</span>
														</span>
													{/if}
													{#if subItem.totalTasks > 0}
														<span class="meta-pill meta-pill-task">
															<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
															<span>{subItem.approvedTasks}/{subItem.totalTasks} Tugas Approved</span>
														</span>
													{/if}
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.tab-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	@media (min-width: 640px) {
		.section-header {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
		}
	}

	.section-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.section-sub {
		font-size: 13px;
		color: var(--text-secondary, #64748b);
		margin: 2px 0 0 0;
	}

	/* Overall Progress Box (Tier 2 Top Right) */
	.overall-progress-box {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 180px;
	}
	.progress-info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		font-weight: 700;
	}
	.progress-label {
		color: var(--text-muted, #64748b);
	}
	.progress-val {
		color: var(--primary, #2563eb);
	}
	.progress-bar-bg {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 9999px;
		overflow: hidden;
	}
	.progress-bar-fill {
		height: 100%;
		background: var(--primary, #2563eb);
		border-radius: 9999px;
		transition: width 0.4s ease;
	}

	/* ══════════════════════════════════════════════════════════
	   2-TIER CATALOG STYLING (Matches Original /siswa/progress)
	   ══════════════════════════════════════════════════════════ */
	.track-catalog-container {
		width: 100%;
	}

	.track-main-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.track-card-header {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.track-card-tags {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.track-card-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 4px 0 0 0;
		line-height: 1.3;
	}

	.track-card-desc {
		font-size: 13.5px;
		color: var(--text-secondary, #475569);
		margin: 0;
		line-height: 1.5;
	}

	.track-card-body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 14px 16px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 12px;
	}

	.rombel-info-line {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	.rombel-label {
		font-weight: 700;
		color: var(--text-primary, #0f172a);
	}

	/* Mini Metrics Grid */
	.metrics-mini-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.mini-stat-item {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 10px;
		padding: 10px;
		text-align: center;
	}

	.mini-stat-val {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		line-height: 1.2;
	}

	.mini-stat-lbl {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		margin-top: 2px;
	}

	/* Progress Box in Catalog Card */
	.progress-box-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.progress-box-top {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		font-weight: 700;
	}

	.progress-box-lbl {
		color: var(--text-muted, #64748b);
	}

	.progress-box-val {
		color: var(--primary, #2563eb);
	}

	.progress-box-bar-bg {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-box-bar-fill {
		height: 100%;
		background: var(--primary, #2563eb);
		border-radius: 9999px;
		transition: width 0.4s ease;
	}

	.track-card-footer {
		display: flex;
		justify-content: flex-end;
	}

	.btn-open-track {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		color: #ffffff;
		border: none;
		border-radius: 10px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
		transition: all 150ms ease;
	}

	.btn-open-track:hover {
		background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
	}

	.btn-open-track:active {
		transform: scale(0.98);
	}

	/* Tier Nav Bar (Back button in Tier 2) */
	.tier-nav-bar {
		margin-bottom: 4px;
	}

	.btn-back-catalog {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary, #475569);
		background: #ffffff;
		border: 1px solid var(--border-hard, #cbd5e1);
		border-radius: 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-back-catalog:hover {
		background: var(--bg-hover, #f1f5f9);
		color: var(--text-primary, #0f172a);
		border-color: #94a3b8;
	}

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 9px;
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		border-radius: var(--radius-full, 9999px);
		box-sizing: border-box;
		white-space: nowrap;
	}

	.badge-grade {
		background: #e0e7ff;
		color: #4338ca;
		border: 1px solid #c7d2fe;
	}

	.badge-active-class {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
	}

	.badge-approved {
		background: #dcfce7;
		color: #15803d;
		border: 1px solid #bbf7d0;
	}

	/* Empty Card Style */
	.empty-card {
		background: #ffffff;
		border: 2px dashed var(--border-hard, #cbd5e1);
		border-radius: 14px;
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.empty-icon {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--primary-light, #eff6ff);
		color: var(--primary, #2563eb);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.empty-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin-bottom: 4px;
	}

	.empty-sub {
		font-size: 13px;
		color: var(--text-muted, #64748b);
		max-width: 400px;
	}

	/* Phase Grid & Cards */
	.phases-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.phase-card {
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 14px;
		padding: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.phase-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.phase-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.phase-title {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
		margin: 0;
	}

	.phase-meta {
		font-size: 12px;
		color: var(--text-muted, #64748b);
	}

	.phase-badge {
		font-family: var(--font-macro, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 800;
		color: var(--primary, #2563eb);
		background: var(--primary-light, #eff6ff);
		padding: 2px 10px;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.phase-bar-bg {
		width: 100%;
		height: 6px;
		background: var(--bg-cell, #f1f5f9);
		border-radius: 9999px;
		overflow: hidden;
	}
	.phase-bar-fill {
		height: 100%;
		background: var(--primary, #2563eb);
		border-radius: 9999px;
	}

	.subphase-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.subphase-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: var(--bg-inset, #f8fafc);
		border: 1px solid var(--border-hard, #e2e8f0);
		border-radius: 10px;
	}

	.subphase-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #cbd5e1;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.subphase-icon--done {
		background: #16a34a;
	}

	.subphase-info {
		flex: 1;
		min-width: 0;
	}

	.subphase-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary, #0f172a);
		word-break: break-word;
	}

	.subphase-meta-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 2px;
	}

	.meta-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #64748b);
		background: #ffffff;
		border: 1px solid var(--border-hard, #e2e8f0);
		padding: 2px 7px;
		border-radius: 6px;
	}

	.meta-pill-task {
		color: #166534;
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.meta-pill-unstarted {
		color: var(--text-muted, #64748b);
		background: var(--bg-cell, #f1f5f9);
		border-color: var(--border-hard, #cbd5e1);
	}

	.type-sub {
		color: var(--text-muted, #64748b);
		font-size: 12px;
	}
</style>
