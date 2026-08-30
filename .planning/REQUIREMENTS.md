# Requirements

## v1 Requirements (MUST)

### Content & Migration

- **REQ-01**: All journal articles from existing BRF site must be migrated to new platform with original publication dates preserved
- **REQ-02**: All conference content (18+ pages) must be migrated with speaker, date, and session metadata intact
- **REQ-03**: All literature/translation pages must be migrated with attribution and source-language metadata
- **REQ-04**: All existing BRF URLs must continue to resolve (via redirect) to the equivalent new-platform page or a sensible landing page
- **REQ-05**: PDF and audio archives stored on Cloudflare R2, linked from migrated pages

### Schema & Data

- **REQ-06**: Astro content collections use Zod schemas for type-safe frontmatter (journal, conference, literature)
- **REQ-07**: Schema freeze must precede template work to decouple templates from Vellum-VPS OCR pipeline unknowns
- **REQ-08**: Redirect mapping must be generated from a complete inventory of old URLs (size unknown until inventory reconciled)

### Deployment & Infrastructure

- **REQ-09**: Static site on Cloudflare Pages — no database, no CMS, no server runtime
- **REQ-10**: Pagefind for static full-text search (no server-side index)
- **REQ-11**: Astro 7.x as framework (current: Astro 7.2 in `brf`, inherited by `brf2`)
- **REQ-12**: Tailwind for styling

### SEO & Discovery

- **REQ-13**: Sitemap.xml auto-generated
- **REQ-14**: RSS feed for journal articles
- **REQ-15**: Open Graph / Twitter Card metadata per page
- **REQ-16**: Structured data (JSON-LD) for articles where appropriate

### Performance & Quality

- **REQ-17**: Static-first — all pages pre-rendered, no client-side data fetching for content
- **REQ-18**: Lighthouse performance ≥ 90 on landing and article pages
- **REQ-19**: Core Web Vitals pass (LCP, CLS, INP within "Good" thresholds)
- **REQ-20**: Accessible (WCAG 2.1 AA) — semantic HTML, keyboard nav, sufficient contrast

### Operations

- **REQ-21**: Deploy via Git push to `main` branch triggers Cloudflare Pages build
- **REQ-22**: DNS cutover from Squarespace to Cloudflare sequenced LAST (after all redirects verified)
- **REQ-23**: Bulk Redirects account on Cloudflare must be provisioned if `_redirects` file exceeds practical limit
- **REQ-24**: britishreformed.org email status confirmed before DNS cutover (Phase 1 DNS audit)

### Documentation

- **REQ-25**: Repository includes `README.md` documenting structure, local dev, deploy

## v2 Requirements (Deferred)

Acknowledged but explicitly out of scope for v1:

- **ENH-01**: Citation snippet generator (e.g. auto-generated "cite this article" block)
- **ENH-02**: Related-articles suggestions on article pages
- **ENH-03**: Per-section RSS (e.g. journal-only, conference-only)
- **ENH-04**: Dynamic OG image generation (per-article, not static)
- **ENH-05**: Faceted search (filter by author/year/topic)
- **ENH-06**: Speaker index page

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| REQ-01..05 | Phase 3 (Bulk Ingestion) |
| REQ-06..08 | Phase 1 (Schema & Redirect Foundations) |
| REQ-09..12 | Phase 2 (Templates & Infrastructure) |
| REQ-13..16 | Phase 2 (Templates & Infrastructure) |
| REQ-17..20 | Phase 2 (Templates & Infrastructure) |
| REQ-21 | Phase 2 (Templates & Infrastructure) |
| REQ-22..24 | Phase 5 (Cutover) |
| REQ-25 | Phase 2 (Templates & Infrastructure) |
