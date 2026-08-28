## Agent Skills & Architecture Guidelines

### Issue Tracker & Domain Docs
- **Issue Tracker**: Local markdown issue tracker under `.scratch/` (see `docs/agents/issue-tracker.md`).
- **Triage Labels**: Canonical 5-role triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.
- **Domain & Architecture**: Ubiquitous language and ADRs in `CONTEXT.md` & `docs/adr/` (see `docs/agents/domain.md`).

### Page Blueprint & UI/UX Standard
- **Gold Standard Blueprint**: Management pages and portal views MUST strictly follow `.agents/rules/page-blueprint.md`.
- **Shared UI Component Library**: Always reuse existing controls from `$lib/components/ui/`:
  - Form & inputs: `FilterBar`, `FormDrawer`, `ConfirmModal`, `CustomSelect`, `DatePicker`, `TextInput`, `TextArea`, `ToggleSwitch`.
  - Data & Metrics: `StatCard` (unified metric cards with variants, pills, icons), `EmptyState` (standard empty/placeholder states), `FilterTabGroup` (horizontal scrollable filter tabs with counters), `PaginationFooter` (standard responsive page navigation with range labels).
- **Standardized Header Cards & Strict Vertical Rhythm**:
  - Two-row structure: `.header-top-row` (navigation/breadcrumb/back button on left, badges on right with `gap: 6px`) and `.header-main-content` (title + subtitle with tight `gap: 4px` desktop, `gap: 3px` mobile).
  - Uniform Badge Dimensions: All badges and top-row pill buttons share consistent height (`26px`), `line-height: 1`, font size (`10.5px` - `11px`), and padding (`0 9px` to `0 10px`) to prevent vertical misalignment.
  - Header Card Spacing: `gap: 10px` (desktop), `gap: 8px` (mobile < 640px). Padding: `16px 20px` (desktop), `12px 14px` (mobile).
- **Student Learning Nomenclature**:
  - Always use **"Track Pembelajaran"** (NEVER "kurikulum") on all student-facing interfaces.
  - Display published tracks with their grade/jenjang classification badge (`tingkatName`) and highlight the student's active class track (`⭐ Track Kelas Anda`).
- **Fluid Mobile Responsiveness (< 640px)**:
  - 100% responsive layouts without horizontal container blowouts (`max-width: 100%`, `box-sizing: border-box`, `word-break: break-word`, `overflow-wrap: anywhere`).
  - Mobile bottom padding on reader/content pages must account for fixed bottom navigation: `padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px))` to prevent bottom bars or buttons from being covered.
  - Global Mode Fokus / Reading Focus: Always apply `.focus-mode-active` overrides in `app.css` (`.app-topbar`, `.app-sidebar`, `.app-bottom-nav { display: none !important; }`) to bypass SvelteKit CSS scoping limits across layout boundaries.
  - Dedicated mobile back buttons with comfortable touch targets.
  - Data tables feature horizontal touch scrolling (`min-width: 680px`), card grid columns collapse to `1fr`, and filter fields stack `100%` full width.
- **Mobile Toast Notification**: Toast Container (`ToastContainer.svelte`) floats below topbar header at `top: 68px` on mobile (< 640px) to prevent covering header titles, with support for touch swipe-to-dismiss gestures.

### Coding & Engineering Standards
1. **Drizzle ORM Queries & Performance**:
   - Prefer explicit SQL SELECT queries (`db.select().from(table).where(...)`) over `db.query.tableName.findFirst` when Drizzle schema relations are omitted, preventing silent `undefined` returns and duplicate insert errors.
   - Always verify non-null foreign key constraints (`kelasInstanceId`, `userId`, `taskId`) before performing database inserts for points or streaks.
   - **Parallel Query Batching (`Promise.all`)**: NEVER execute N+1 database queries inside `for` loops or map functions. Always extract entity IDs and execute count/aggregate queries in parallel using `Promise.all([db.select()..., db.select()...])` to keep API response times under 50ms.
2. **Form Actions & Svelte 5 Runes**:
   - Use Svelte 5 runes (`$state`, `$derived`, `$props`) and SvelteKit `use:enhance`.
   - Implement graceful status handling: Return success responses without throwing HTTP 500 errors when a record is already in the requested state.
   - **Untracked Reactive State Updates**: When updating a `$state` object inside an `$effect` based on incoming page data, use `untrack(() => state)` to read the previous state without creating a circular reactive dependency loop (which causes infinite re-render loading spinners).
3. **Destructive Action Safety**:
   - Destructive actions (deleting records, withdrawing submissions, logging out) MUST require confirmation via `ConfirmModal.svelte`.
   - Action buttons must feature clear SVG icons (e.g. topbar mobile logout button).
