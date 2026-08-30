# Roadmap

5 phases. 25 v1 requirements. Sequenced so each phase unblocks the next. Revised 2026-08-29 against actual deployment state — the previous version assumed a from-scratch build, but `brf2` already shipped a pilot.

## Phase 1 — Schema Completion & Redirect-Mapping Foundations

**Goal:** Finish the schema work that's already mostly done, and lock down the redirect inventory so Phase 4 can generate redirects mechanically.

**Requirements covered:** REQ-07 (partial — `articles` schema done; `conferences`, `literature` to go), REQ-08 (redirect inventory), REQ-24 (DNS audit partial)

**Status:** Partial — `articles` Zod schema frozen and validated against 3 samples; `conferences` and `literature` schemas not started; redirect inventory unstarted; DNS audit unstarted.

**Exit criteria:**
- `conferences` content collection with Zod schema (sessions/speakers), validated against real conference records
- `literature` content collection with Zod schema (translations, attribution metadata), validated against real source data
- Complete inventory of old BRF URLs reconciled (count + sample structure)
- DNS audit confirms whether britishreformed.org currently has live email
- Decision logged: `_redirects` file vs. Cloudflare Bulk Redirects

**Why first:** Decouples template work from the unresolved Vellum-VPS OCR pipeline (template authors don't need OCR output to start).

## Phase 2 — Templates & Infrastructure

**Goal:** Finish the static-site shell, templates, and CI/CD pipeline. Conference content (18+ pages, non-OCR-blocked) authored in this phase as the first real content.

**Requirements covered:** REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-25

**Status:** In progress — pilot shipped 2026-08-17. Layouts for journal article rendered; static page set (index, about, beliefs, conferences placeholder, contact, donate) live; `articles` collection wired with 3 pilot articles + PDFs; dark/light/auto theming; mobile drawer; Cloudflare Pages deployment operational.

**Exit criteria:**
- Layouts for conference session and literature page rendering
- Conference content (18+ pages) fully authored from existing BRF data
- Sitemap, RSS, OG metadata, JSON-LD all generated
- Lighthouse ≥ 90, WCAG 2.1 AA passes
- Cloudflare Pages build wired to `main` branch — operational since 2026-08-17

**Why second:** Provides the shell that Phase 3 ingests content into. Conference content chosen because it doesn't depend on the OCR pipeline.

## Phase 3 — Bulk Content Ingestion

**Goal:** All remaining journal articles and literature/translations migrated from Squarespace.

**Requirements covered:** REQ-01, REQ-02, REQ-03, REQ-05

**Status:** Partial — 3 of N articles migrated (pilot). Schema in place. Bulk ingestion unstarted.

**Exit criteria:**
- All journal articles migrated with original publication dates
- All literature/translation pages migrated with attribution metadata
- PDF/audio archives uploaded to Cloudflare R2 and linked
- Search (Pagefind) index built and functional

**Why third:** Depends on Phase 1 (schema) and Phase 2 (templates). Final article slugs determined here, which Phase 5 needs for redirects.

## Phase 4 — Redirect Generation & Validation

**Goal:** Generate the complete redirect mapping and validate every old URL resolves correctly to its new equivalent (or a landing page).

**Requirements covered:** REQ-04, REQ-08 (completion)

**Status:** Not started.

**Exit criteria:**
- Every old BRF URL has a verified redirect target
- Bulk Redirects provisioned if `_redirects` would exceed limit
- Automated test runs against the redirect set (e.g. crawl the old sitemap, assert 200/301)

**Why fourth:** Needs final slugs from Phase 3 and shell from Phase 2 for testing.

## Phase 5 — DNS Cutover & Launch

**Goal:** Point britishreformed.org at Cloudflare Pages and decommission Squarespace.

**Requirements covered:** REQ-22, REQ-23, REQ-24 (completion)

**Status:** Not started.

**Exit criteria:**
- DNS records updated; HTTPS cert provisioned
- Email (if any) migrated or confirmed handled
- Old Squarespace plan cancelled
- brf2.pages.dev replaced by britishreformed.org in all docs

**Why last:** Final article slugs aren't known until Phase 3; redirects aren't validated until Phase 4. Cutover without these would orphan URLs.

## Phase Summary

| # | Phase | Status |
|---|-------|--------|
| 1 | Schema Completion & Redirect-Mapping Foundations | Partial (articles schema done; rest pending) |
| 2 | Templates & Infrastructure | In progress (pilot shipped) |
| 3 | Bulk Content Ingestion | Partial (3/N articles) |
| 4 | Redirect Generation & Validation | Not started |
| 5 | DNS Cutover & Launch | Not started |