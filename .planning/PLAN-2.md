# PLAN-2 — Phase 2: Polish, Performance & Asset Upload

**Project:** BRF2 (`/home/workspace/1 Projects/brf2`)
**Plan date:** 2026-09-01
**Owner:** Manuel Kuhs
**Supersedes:** None (this is the first formal Phase 2 plan)
**Locked decisions (from chat 2026-09-01):**
- OD-1: Conference list is complete (43 conferences in `src/content/conferences/`, already routed at `/conferences/`).
- OD-2: PDF/MP3 strategy locked in Phase 1.5 → Cloudflare R2 free tier. Do not re-litigate.
- OD-3: Upload **all** PDFs to R2 — 73 issue PDFs + several hundred article PDFs. Do not cherry-pick.
- WS-2.7/2.8/2.9 (redirect inventory, DNS audit, launch) are **deferred to Phase 4** per ROADMAP.md.

## Status of WS-2.1 / WS-2.2 (verified 2026-09-01)

| Workstream | Status | Evidence |
| --- | --- | --- |
| WS-2.1 Conferences route | **Already shipped** | `src/pages/conferences/index.astro`, `[year].astro`, `[...slug].astro` exist. Live at https://brf2.pages.dev/conferences/ (43 entries). No work needed. |
| WS-2.2 Literature route | **Already shipped** | `src/pages/literature/index.astro`, `[slug].astro` exist. Literature entries are filtered from the `journal` collection via `section === 'literature'`. No work needed. |

Both are **verify-only** — confirm on a deployed build that the routes still render and add an audit note to `STATUS.md`.

## Phase 2a scope (EXECUTE NOW)

### WS-2.3 — Conference content authoring (small)

**Reality:** Conferences exist as JSON with `title`, `venue`, `dates`, `year`, `theme`, `subtitle`, `legacyPath`, `section: "conference"`. **No `speakers`, `messages`, or `description`** fields. The live conference page is a flat year-grid.

**Deliverables:**
1. For each of 43 conferences, add a `description` (1–2 sentences) field — short if missing. Do **not** invent speakers/messages without user-provided list.
3. Decide on routing for the 43 review-style `.md` files in `src/content/conferences/` (currently orphaned — slug like `a-review-of-the-2010-brf-conference`). Two options:
   - **A.** Surface them on the corresponding conference page as "Reviews" section.
   - **B.** Add `/literature/[slug]/` link from each one (they're already routed via `section === 'literature'`? — verify).
   - **Default:** Inspect first, then route to literature if they pass the literature schema.
3. Polish `src/pages/conferences/[year].astro` template — add conference metadata, theme, speakers (when known), and links to messages once R2 has them.

**Acceptance:** Conference page shows theme/venue/dates and a "Reviews" section when review content exists for that year. Build passes; live at `/conferences/2024/`.

### WS-2.4 — R2 asset upload (CRITICAL)

**Reality:** No PDFs in `public/` today. PDFs are referenced by `pdfUrl` field in journal entries and `pdfUrl` in issue JSONs. Without R2, those URLs point nowhere.

**Deliverables:**
1. **Audit** — collect all `pdfUrl` values from `src/content/journal-issues/*.json` (74) and `src/content/journal/*.md`/`.json` (~426 entries). Filter out empty strings. Output: `scratch/phase-2/pdf-urls.csv` with columns `kind,issue_number_or_article_id,url,filename`.
2. **Categorize by kind**:
   - Issue PDFs → `r2:brf/pdfs/issues/issue-NN.pdf`
   - Article PDFs → `r2:brf/pdfs/articles/{article-id}.pdf`
3. **Upload to R2** via `wrangler r2 object put` (or `mc`) using the project's Cloudflare account (already connected). Use concurrent batched uploads (~20 in flight).
4. **Rewrite `pdfUrl` values** in content to R2 public URLs (e.g. `https://r2.brf.org/pdfs/issues/issue-01.pdf`). Keep original Squarespace URL in a `legacyPdfUrl` field for rollback.
5. **Verify** with HEAD requests on the new URLs — 200 OK.

**Acceptance:** All `pdfUrl` values resolve to live R2 URLs. Sample-check 10 random URLs in browser — PDFs render.

**Sub-deliverable for MP3s (parked):** MP3 upload depends on finding the Squarespace export. Per Phase 1.5 memory: no MP3 files in workspace yet. **Park WS-2.4 MP3 sub-workstream** — leave conference page MP3 fields empty, do not block on this.

### WS-2.5 — Lighthouse + WCAG audit

**Reality:** Astro 7 + Tailwind 4 static site. Dark mode toggle present (`src/styles/global.css` per commit history). No previous Lighthouse report.

**Deliverables:**
1. Run Lighthouse against the deployed preview (or build preview) for these key routes:
   - `/` (home)
   - `/journal/`
   - `/journal/issue-01/` (sample issue)
   - `/conferences/`
   - `/conferences/2024/`
   - `/literature/`
2. Target: **Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90.**
3. If any route fails, log specific findings to `scratch/phase-2/lighthouse-report.md` with concrete fixes.
4. WCAG 2.1 AA: spot-check contrast on dark/light themes, image alt text presence, semantic landmarks, keyboard navigation through nav drawer.

**Acceptance:** All key routes score ≥ 90. Findings doc exists for any sub-90 result.

### WS-2.6 — README documentation

**Reality:** A `README.md` exists at project root. Need to verify it documents: structure, local dev, deploy process, content authoring workflow, R2 upload process.

**Deliverables:**
1. Audit current `README.md` against Phase 2 needs.
2. Add sections:
   - Local dev setup (`npm install`, `npm run dev`)
   - Build & deploy (`npm run build` → Cloudflare Pages from `main`)
   - Content authoring (how to add a journal article, conference, literature entry)
   - R2 upload (link to `scratch/phase-2/r2-upload.md` script + process)
   - Phase progression (link to `.planning/ROADMAP.md` and `.planning/STATE.md`)
3. Keep concise. One canonical file, no duplication across docs.

**Acceptance:** New contributor (or future Manuel) can run the site, add a journal entry, and upload an asset by reading only the README.

### Verify-only (WS-2.1, WS-2.2)

After WS-2.3/2.4/2.5/2.6 land:
- Confirm `/conferences/` and `/literature/` still render correctly.
- Confirm no broken internal links introduced by PDF URL rewrites.
- Update `STATUS.md` with Phase 2 completion line.

## Phase 2b (PARKED — do not execute in 2a)

- WS-2.7 Redirect inventory generation (for old Squarespace URLs → new routes)
- WS-2.8 DNS audit + `_redirects` provisioning
- WS-2.9 Redirect validation (requires DNS cutover, which is Phase 4)

## Execution plan

Workstreams 2.3, 2.4, 2.5, 2.6 will run as **four sequential agent dispatches** (one per WS), each producing a concrete artefact on disk and a one-paragraph completion note. WS-2.3 and WS-2.5 are quick (≤30 min each); WS-2.4 is the long one (PDF count + upload time); WS-2.6 is documentation.

Wave 1 (parallel where possible):
- WS-2.3 conference content (depends on: nothing)
- WS-2.6 README (depends on: nothing)

Wave 2 (after Wave 1):
- WS-2.4 R2 upload (depends on: nothing else, but uploads are large — run as separate dispatch)
- WS-2.5 Lighthouse audit (depends on: WS-2.3 landing, since conference page template changed)

Final:
- Verify WS-2.1/2.2 still pass
- Update STATUS.md, STATE.md, ROADMAP.md to mark Phase 2 complete
- Commit + push to `main`

## Out of scope for Phase 2

- **MP3 hosting on R2** — blocked by missing Squarespace export; park.
- **Search** — separate workstream (page content `search.json` exists, route not built yet).
- **Membership/auth, commenting, analytics** — Phase 3+.
- **DNS, redirects, launch** — Phase 4.