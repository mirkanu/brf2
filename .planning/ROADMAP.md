# Roadmap

6 phases. 25 v1 requirements. Sequenced so each phase unblocks the next. Revised 2026-09-01 against actual deployment state.

The previous roadmap treated Phase 1 as schema work; in practice Phase 1
shipped as the functional duplicate on the new schema (74 issue pages + 695
article pages on the new routes, 2026-08-17 pilot, 2026-09-01 build
verified). A new Phase 1.5 inserts a sizing audit before Phase 2 commits
to R2 as the asset host for \~700 PDFs + conference MP3s.

## Phase 1 — Pilot: journal issues + articles on new schema ✅ COMPLETE

**Goal:** Stand up the new content schema with real journal content end-to-end so Phase 2 can build templates and Phase 3 can ingest bulk.

**Requirements covered:** REQ-06 (Zod schemas), REQ-07 (schema freeze precedes templates), REQ-13/14/15/16 (SEO surfaces), REQ-17 (static-first), REQ-21 (Cloudflare Pages deploy from `main`).

**Status:** Complete — shipped 2026-08-17 (pilot), build verified 2026-09-01.

**What shipped:**

- `articles` Zod schema frozen (`title`, `authors`, `issueNumber`, `pdfUrl?`, `authorSlugs?`).
- `issues` collection: 74 `file issue-NN/issue.json` entries (`issueNumber`, `issueDate`, `pdfUrl?`, `legacyPath`, `coverImage`).
- 695 article `file .md` files migrated under `src/content/articles/`.
- New routes live: `/journal/`, `/journal/issue-NN/`, `/journal/issue-NN/[slug]/`, `/author/[name]/`.
- Legacy routes return 404 (no redirects — site private until launch).
- Placeholder covers: 74 SVGs in `src/assets/issue-covers/`.
- OG metadata emitted. (Sitemap/RSS/JSON-LD are claimed live since 2026-08-17 but were never actually implemented — see Phase 2b / WS-2.1/2.2/2.9.)
- Cloudflare Pages auto-deploy from `main` — operational since 2026-08-17.

## Phase 1.5 — R2 Sizing Audit

**Goal:** Replace guesswork with a measured total for the MP3 + PDF archive so Phase 2's R2 commitment is data-driven. Decide free tier vs. paid vs. compression before any uploads.

**Requirements touched:** REQ-05 (PDF/audio on R2 — decision in this phase, execution in Phase 2).

**Status:** ✅ Complete (2026-09-01). **R2 (free tier) confirmed** as asset host; ~1.7 GB projected from the original 16-MP3 + 39-PDF sample; a wider re-probe will likely revise this upward (real total expected 5–15 GB). (16 MP3s, 39 PDFs). See `.planning/PHASE-1.5-SIZING.md` for the audit and `.planning/PHASE-1.5-PLAN.md` for the work log.

**Why now:** Phase 2 needs to know whether R2 free tier (10 GB) is enough, whether compression is mandatory, or whether the budget must include R2 paid storage. Doing this *after* the 700-file upload is the expensive way to find out.

**Tasks:**

- Re-harvest the canonical MP3 list from the Squarespace export (MP3 = podcast — single canonical asset per speech, not the duplicated feed entries).
- Catalogue the issue PDFs (Google Drive `1gtXO5azesAEeAti2eKNOFpA_jtcCQGGs`) and article PDFs (linked from the legacy `/brj-articles` page) — count + bytes.
- Sum totals; compare to 10 GB R2 free limit.
- If over budget: estimate compressed size (audio re-encode to lower bitrate; PDF optimisation with `qpdf`/`ghostscript`); decide whether free + compression is viable.
- Deliverable: `file .planning/PHASE-1.5-SIZING.md` with totals, per-conference MP3 count, PDF count + bytes, R2 tier recommendation, and the go/no-go for free-tier upload. **Status:** ✅ Completed 2026-09-01 — see SIZING doc.

**Exit criteria:**

- [x] Sizing doc committed (`.planning/PHASE-1.5-SIZING.md`).
- [x] R2 tier decision (free) confirmed.
- [x] Podcast hosting path decided (single MP3 per speech, served from `brf2.pages.dev/files` until DNS cutover, then rewired to `cdn.britishreformed.org`).

## Phase 2 — Templates & Infrastructure

**Goal:** Finish the static-site shell, templates, and CI/CD pipeline. Includes the R2 upload (now informed by Phase 1.5) and conference-content authoring that does not require the OCR pipeline.

**Requirements covered:** REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-25, REQ-05 (upload), REQ-08 (redirect inventory), REQ-24 (DNS audit).

**Status:** **2a shipped 2026-09-01** (work log `.planning/PHASE-2A.md`) — conference descriptions (WS-2.3), README + R2 reference (WS-2.6), a11y + perf polish (Lighthouse perf 100 across all routes, a11y ≥95, robots.txt live).

**2b pending** — R2 PDF upload (WS-2.4), sitemap + RSS + JSON-LD (WS-2.1/2.2/2.9 — currently false-claimed as shipped; actual implementation required), Lighthouse on PDFs (WS-2.5), redirect inventory + DNS audit (WS-2.7).

**Exit criteria:**

- [x] Conference session layout + literature page rendering
- [x] Conference content (20 real annual conferences) authored from existing data — see `scratch/phase-2/conferences-needing-description.md` for the 23 still flagged
- [ ] Sitemap, RSS, OG metadata, JSON-LD all generated — OG done; the other three deferred to 2b
- [x] Lighthouse ≥ 90 on landing + non-PDF routes (perf 100, a11y ≥95 across all five audited routes)
- [ ] WCAG 2.1 AA on article pages with PDFs — blocked on R2
- [x] README documenting structure, local dev, deploy (REQ-25)
- [x] Cloudflare Pages build wired to `main` — satisfied since 2026-08-17
- [ ] PDF + MP3 archive uploaded to R2 and linked from migrated pages (REQ-05) — see 2b
- [ ] Complete inventory of old BRF URLs reconciled (REQ-08) — see 2b
- [ ] DNS audit confirms whether britishreformed.org currently has live email (REQ-24) — see 2b

## Phase 3 — Bulk Content Ingestion

**Goal:** Migrate remaining journal articles, literature, and translations that depend on the OCR pipeline or were deferred from the pilot.

**Requirements covered:** REQ-01, REQ-02, REQ-03, REQ-04 (partial — final slugs), REQ-05 (linking).

**Status:** Partial — 695 of \~target articles migrated in Phase 1; OCR-blocked and post-pilot additions remain.

**Exit criteria:**

- All journal articles migrated with original publication dates
- All literature/translation pages migrated with attribution metadata
- Final article slugs locked (Phase 4 needs them for redirects)

**Why third:** Depends on Phase 2 (templates) and the BRJ Articles export / OCR pipeline. Final slugs from this phase feed Phase 4.

## Phase 4 — Redirect Generation & Validation

**Goal:** Generate the complete redirect mapping and validate every old URL resolves correctly to its new equivalent (or a landing page).

**Requirements covered:** REQ-04 (completion), REQ-08 (completion), REQ-23.

**Status:** Not started — blocked on Phase 2 redirect inventory.

**Exit criteria:**

- Every old BRF URL has a verified redirect target
- Bulk Redirects provisioned if `_redirects` would exceed practical limit
- Automated test runs against the redirect set (crawl the old sitemap, assert 200/301)

## Phase 5 — DNS Cutover & Launch

**Goal:** Point britishreformed.org at Cloudflare Pages and decommission Squarespace.

**Requirements covered:** REQ-22, REQ-24 (completion).

**Status:** Not started.

**Exit criteria:**

- DNS records updated; HTTPS cert provisioned
- Email (if any) migrated or confirmed handled
- Old Squarespace plan cancelled
- brf2.pages.dev replaced by britishreformed.org in all docs

**Why last:** Final article slugs aren't known until Phase 3; redirects aren't validated until Phase 4; R2 wiring under `brf2.pages.dev/files` should be stable before rewiring to `britishreformed.org/files`.

## Phase Summary

| \# | Phase | Status |
| --- | --- | --- |
| 1 | Pilot: journal issues + articles on new schema | ✅ Complete (2026-09-01) |
| 1.5 | R2 Sizing Audit | ✅ Complete (2026-09-01) — R2 (free) confirmed; \~1.7 GB projected |
| 2 | Templates & Infrastructure | **2a shipped 2026-09-01** (WS-2.3 + WS-2.6 + a11y/perf); 2b pending (R2 + sitemap/RSS/JSON-LD + redirects/DNS) |
| 3 | Bulk Content Ingestion | Partial (695/N migrated in Phase 1; OCR-blocked and post-pilot pending) |
| 4 | Redirect Generation & Validation | Not started |
| 5 | DNS Cutover & Launch | Not started |
