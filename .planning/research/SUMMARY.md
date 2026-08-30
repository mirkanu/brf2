# Project Research Summary

**Project:** BRF Site Migration (britishreformed.org — Squarespace to static archive)
**Domain:** Static content-archive / publication site migration (nonprofit journal + conference media archive, AI-agent-authored, zero server maintenance)
**Researched:** 2026-08-10
**Confidence:** HIGH

## Executive Summary

This project migrates britishreformed.org — a 77-issue, 413+-article theological journal archive plus 18+ conference pages — off Squarespace onto an Astro static site on Cloudflare Pages, authored entirely as MDX/YAML files in git by an AI agent with no human editor or CMS in the loop. Experts build this class of product (large, structured, AI-agent-authored content archive) on a static-site generator with a typed/validated content layer, client-side search, and binary assets split out of the git repo entirely. Research strongly converges on Astro 7 (content collections with Zod schemas, MDX support, zero-JS-by-default), Pagefind for full-text search (client-side, zero backend, zero cost), and Cloudflare R2 for the 346+ PDFs and conference audio (kept out of git and out of the Pages deployment to avoid Cloudflare's 25 MiB file cap and repo bloat). This stack directly satisfies the project's hard constraints: no database, no headless CMS, no server, content as files in git.

The recommended approach is to decouple the content pipeline from the template/design work: freeze the frontmatter schema early (informed by inspecting real OCR samples, not waiting for the full pipeline), build and validate templates against a small hand-authored sample (2-3 issues), then scale ingestion to all 413 articles once both schema and templates are proven. Author/topic/issue metadata is the single highest-leverage dependency — search, browsing, citations, and related-articles all trace back to it, so it should be sequenced as an early, explicit decision rather than an assumed byproduct of OCR.

The dominant risks are not architectural but data-quality and migration-process risks: (1) OCR corruption (jumbled multi-column reading order, orphaned footnotes, garbled Greek/Hebrew) silently shipping into a "finished" scholarly archive with no second cleanup pass; (2) an incomplete or late-built 301 redirect map causing real SEO/backlink/Scholar-index loss, since Squarespace exposes no authoritative URL export and dynamic category/filter URLs must be crawled and reconciled against three independent sources; (3) Cloudflare Pages' `_redirects` file having a real-world practical limit lower than its documented 2,000-line cap, which could silently drop redirects for a site with 500+ distinct old-URL patterns; and (4) DNS cutover accidentally breaking email if MX/SPF/DKIM records aren't audited and preserved separately from the A/CNAME change. All four are addressable with process gates (reconciliation checks against known totals, sample-audit QA, pre-cutover full-crawl verification, DNS zone export) rather than technology changes.

## Key Findings

### Recommended Stack

Astro 7.2.0 is the clear choice over Next.js static export, Eleventy, or Hugo for this specific workload: its Content Layer API gives Zod-schema-validated MDX collections that fail the build loudly on malformed frontmatter — the closest thing to editorial review this unattended, AI-agent-only authoring pipeline gets. Next.js is ruled out because static export is a secondary workaround mode (broken image optimization, no ISR, manual route enumeration) for a framework architected around having a server, which this project explicitly doesn't want. Pagefind provides full-text search entirely client-side (WASM, indexes built HTML post-build, no API key, no per-query cost, no third-party data leakage — a real fit for a nonprofit with no marketing budget and privacy-conscious posture). Cloudflare Pages hosts the static build with zero-config git-push CI/CD; no Cloudflare adapter is needed since output is pure static.

**Core technologies:**
- **Astro 7.2.0** — SSG with typed content collections (Zod schemas via `content.config.ts`) — purpose-built for hundreds of structured Markdown/MDX files with build-time validation
- **@astrojs/mdx + astro-pagefind + @astrojs/sitemap** — MDX authoring, post-build search indexing, auto sitemap for SEO preservation
- **Cloudflare Pages** — static hosting, git-integrated deploys, already the account used for DNS/tunnels per global VPS convention
- **Cloudflare R2** — binary storage for 346+ PDFs and conference audio, referenced by URL from frontmatter, kept entirely out of git/Pages to avoid the 25 MiB per-file limit and repo bloat
- **Tailwind CSS v4** — styling (CSS-first config); shadcn/ui explicitly NOT used here since it assumes a Next.js/React shell — reserve React only for interactive islands (search/filter UI)

### Expected Features

**Must have (table stakes):**
- Issue TOC pages, author index/pages, topic browsing — matches existing site nav promise, but all three are metadata-blocked on OCR/author-attribution output
- Inline full-text article view + downloadable PDF per article — core value proposition of the migration
- Full-text search (Pagefind) — already decided, essential at 413-article scale
- Breadcrumb nav, print-friendly CSS, XML sitemap — near-zero cost, expected baseline
- Conference archive (18+, video+audio) and 301 redirect map — both Active requirements

**Should have (competitive, add post-launch):**
- "Cite this article" snippet, related-articles by author/topic/issue, faceted search (Pagefind filters), RSS/Atom feed, OG social share images, conference speaker index — all layer on top of metadata table-stakes already requires, no new data-collection burden

**Defer (v2+):**
- PWA manifest, privacy-friendly analytics (Cloudflare Web Analytics) — no user demand evidence, zero migration cost to add later

**Explicitly excluded (anti-features):** user accounts/bookmarks, comments, AI chatbot Q&A (doctrinal-accuracy risk), paywall/subscription gating, in-browser PDF annotation, native mobile app, hosted search backend (Algolia), ML content recommendations, on-demand machine translation — all conflict with the zero-maintenance/no-database/no-server constraints or introduce unacceptable doctrinal-accuracy risk.

### Architecture Approach

Four-layer pipeline: an offline content-ingestion layer (SSH-pull from Vellum-VPS, metadata extraction, MDX writer) produces schema-conformant files into a git-backed content layer (`content/articles/issue-NN/*.mdx` + `content/authors/`, `content/issues/` as referenced data collections); Astro's build layer renders templates against Zod-validated collections and runs Pagefind as a postbuild indexing step; Cloudflare Pages + R2 form the delivery layer, with a hard split — text/metadata in git, binaries (PDFs, audio) in R2, never mixed. A `status` frontmatter field (draft/needs-review/published) acts as the AI-agent's publication gate since there's no separate CMS draft mode to lean on.

**Major components:**
1. Content pipeline scripts (`scripts/ingest/`) — pull OCR text, extract article boundaries/metadata, write schema-conformant MDX; runs as an occasional batch job, never part of `astro build`
2. Content collections (`content.config.ts`) — the single enforced contract between pipeline output and template input; catches malformed frontmatter at build time
3. Astro templates (Article/Issue/Conference/Author-Topic index) — render collections into static HTML, `getStaticPaths()` filtered to `status: published`
4. Delivery layer (Cloudflare Pages for HTML/CSS/JS, R2 for PDFs/audio, `_redirects`/Bulk Redirects for the 301 map) — all decoupled, R2 referenced by URL only, redirects evaluated at Cloudflare's edge before Pages asset resolution

### Critical Pitfalls

1. **Redirect map built too late or from an incomplete URL inventory** — Squarespace exposes no authoritative URL export; reconcile three independent sources (Google Search Console index, full Playwright crawl including pagination/filters, sitemap.xml) before finalizing, starting during ingestion, not at launch.
2. **OCR text corruption (column-jumbling, orphaned footnotes, garbled Greek/Hebrew, unrejoined hyphenation) shipped unreviewed** — treat OCR output as never publish-ready as-is; budget a scripted de-hyphenation/reflow pass, flag non-Latin Unicode spans for manual review, and sample-audit 20-30 articles across eras against source PDFs before considering the pipeline done.
3. **Cloudflare Pages `_redirects` limit silently dropping redirects** — documented cap is 2,000 static + 100 dynamic, but at least one real-world report shows failures as low as ~444 lines; with 413+ articles + 77 issues + author/topic/conference URLs the map will likely approach or exceed safe limits — plan for Bulk Redirects and verify the account's actual dashboard-confirmed quota, not just docs.
4. **DNS cutover breaking email via dropped MX/SPF/DKIM records** — export and document the complete current zone before any change, confirm whether "Contact Us"/info@ addresses are live mailboxes, and treat MX changes as a separate, independently-verified operation from the A/CNAME cutover.
5. **Crawler silently missing JS-rendered or paginated content** — a crawl that "finishes without errors" can still be incomplete; every extraction run must reconcile its article/issue count against the known 413+/77 baseline before being trusted.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Content Schema & Redirect-Mapping Foundations
**Rationale:** The frontmatter schema and the URL inventory are the two highest-leverage, most decoupling-enabling artifacts — both can and should be built before the OCR pipeline is finished, and both gate almost everything downstream (templates, ingestion, cutover safety).
**Delivers:** Frozen `content.config.ts` Zod schema (articles/issues/authors/conferences) informed by inspecting real Vellum-VPS OCR samples; a reconciled old-URL inventory (GSC export + full Playwright crawl + sitemap.xml) as a living redirect-map spreadsheet; DNS zone export/audit (including MX/SPF/DKIM) documented early.
**Addresses:** Foundational data model for issue/author/topic browsing (FEATURES.md table stakes); redirect map (Active requirement)
**Avoids:** Pitfall 1 (late/incomplete redirect map), Pitfall 5 (DNS/email breakage), Pitfall 3 (crawler missing content)

### Phase 2: Template & Design Build Against Sample Content
**Rationale:** Decouples template work from the unresolved OCR pipeline — hand-author or lightly script 2-3 sample issues (~15-20 articles) conforming to the frozen schema, then build/validate templates against real structural edge cases (multi-author, co-authors, missing dates) while the cost of a schema change is still low.
**Delivers:** ArticleLayout, IssueLayout, ConferenceLayout, Author/Topic index pages; R2 asset-linking (PDF download, conference audio embed) wired in parallel; core design system (Tailwind v4, reading-optimized typography, print CSS, breadcrumbs)
**Uses:** Astro content collections, `@astrojs/mdx`, `@astrojs/react` (only for interactive islands), Astro Fonts API, View Transitions
**Implements:** Content Collections pattern (pipeline↔template contract), R2-for-binaries/git-for-text hard split

### Phase 3: OCR Ingestion Pipeline & QA Gate
**Rationale:** Once schema and templates are proven, full-scale ingestion (346 PDFs → 413+ articles) can run as a mechanical, high-volume phase without blocking on further template/design changes — but this phase must include a mandatory, non-optional OCR QA gate given the corpus size and scholarly-accuracy stakes.
**Delivers:** All 413+ articles ingested with `status: needs-review` → `published` gating; sample-audited (20-30 articles across eras) for column order, footnote association, hyphenation, and Greek/Hebrew integrity; article/issue counts reconciled against the known 413+/77 baseline
**Addresses:** Inline article text + PDF download (P1 feature), author/topic metadata unblocking (FEATURES.md dependency chain)
**Avoids:** Pitfall 4 (unreviewed OCR corruption) — treated as its own dedicated QA sub-phase, not folded silently into ingestion

### Phase 4: Search, Cross-Cutting Browse Pages & Secondary Content
**Rationale:** Pagefind should be wired last since it indexes rendered HTML — every template change re-tuning search relevance is wasted work if done before layouts stabilize. Author/topic aggregate pages depend on the full article collection existing, so they naturally follow bulk ingestion.
**Delivers:** Pagefind full-text search wired as a postbuild step; Author/Topic index pages built from the full corpus; Literature/Translations/BRF News Alert/About-Doctrinal-Membership-Contact pages migrated (lower complexity, independent of journal pipeline)
**Uses:** astro-pagefind, Pagefind filtering/faceting (if scoped in), aggregate build-time queries over the `articles` collection

### Phase 5: Redirect Finalization, Cutover & Post-Launch Verification
**Rationale:** Literal per-article redirect mappings can't be finalized until every article has a real, final slug (i.e., after bulk ingestion); redirect deployment and DNS cutover are the highest-blast-radius, hardest-to-recover operations in the project and must be sequenced last with explicit verification gates.
**Delivers:** Final `_redirects`/Bulk Redirects deployment (sized against actual dashboard-confirmed quota, not just docs) cross-referenced against the Phase 1 URL inventory and final content slugs; full pre-cutover crawl verifying every redirect resolves 301→200; DNS cutover executed with pre-lowered TTLs and MX/email preserved; 30-day post-launch Search Console monitoring for 404 spikes
**Addresses:** 301 redirect map (Active requirement), DNS-only cutover (Active requirement)
**Avoids:** Pitfall 6 (`_redirects` limit exceeded), Pitfall 7 (SEO/Scholar de-indexing during cutover), Pitfall 5 (DNS/email breakage — verification step)

### Phase Ordering Rationale

- Schema-freeze and redirect-inventory work is sequenced first specifically because ARCHITECTURE.md's "Suggested Build Order" identifies the OCR pipeline (external, unresolved dependency on Vellum-VPS) as something that should **not** gate template/design work — freezing the schema against real samples decouples the two workstreams.
- Bulk ingestion is deliberately placed after templates are proven against a small sample, per architecture research's explicit warning that discovering schema gaps against 413 files is far more expensive than against 20.
- Search (Pagefind) is placed near the end per Anti-Pattern 4 in ARCHITECTURE.md — indexing before template HTML structure stabilizes causes repeated re-tuning for no benefit, since Pagefind is fast to add regardless of when it's wired in.
- Redirect finalization and DNS cutover are placed last because PITFALLS.md's highest-severity, least-recoverable risks (Scholar de-indexing, email breakage) all stem from cutover being treated as "flip DNS" rather than "verify everything first" — the roadmap should treat verification tooling (built during Phase 1) as reusable across Phase 5's pre- and post-cutover checks.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Content Schema & Redirect-Mapping):** OCR output format from Vellum-VPS is still unknown (explicit PROJECT.md gap) — schema design needs a `/gsd-research-phase` or equivalent inspection step once real OCR samples are available, particularly around footnote/Greek-Hebrew handling.
- **Phase 3 (OCR Ingestion & QA Gate):** Layout-aware OCR cleanup (column reordering, hyphenation rejoining, non-Latin script handling) has no directly comparable case study found in research — treat as needing its own focused investigation once actual OCR tool/output is confirmed.
- **Phase 5 (Redirect Finalization & Cutover):** Cloudflare Bulk Redirects' actual account-level quota (docs say 10,000 free-tier; community reports show some accounts capped at 20) must be verified directly in-dashboard before this phase is planned in detail.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Template & Design Build):** Astro content collections, MDX rendering, and Tailwind v4 integration are all officially documented, HIGH-confidence, well-established patterns.
- **Phase 4 (Search & Browse Pages):** Pagefind integration (postbuild CLI step + UI component) is a well-established community pattern with official docs; aggregate build-time queries are standard Astro Content Collections usage.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified live against npm registry versions/engines, official Astro/Cloudflare docs; MEDIUM only on PDF-size and redirect-volume assumptions pending real data |
| Features | MEDIUM | WebSearch-verified across academic journal, sermon-archive, and digital-magazine analogs; no single directly-comparable "small confessional journal on a static site" example exists, so specifics are extrapolated |
| Architecture | HIGH | Cloudflare Pages limits, Astro content collections, and Pagefind behavior all verified against official docs/current sources; MEDIUM only on final redirect-map sizing, which depends on the not-yet-complete URL inventory |
| Pitfalls | MEDIUM-HIGH | Official docs (Squarespace, Cloudflare) plus peer-reviewed sources on OCR/column-layout extraction and Greek/Hebrew OCR; no case study of this exact site found, so severity estimates are inferred from general migration patterns, and the `_redirects` 444-line report is a single unresolved community thread (LOW-MEDIUM on that specific claim) |

**Overall confidence:** HIGH — the stack and architecture decisions are well-grounded in official, current sources and directly satisfy the project's explicit constraints (no database, no server, content-as-files). The main uncertainty is data-dependent (OCR output quality/format, final redirect-map size) rather than technology-choice risk, and both are already flagged as explicit open items in PROJECT.md.

### Gaps to Address

- **OCR output format/quality unknown:** The single biggest unresolved dependency across all four research files. Cannot fully validate the content schema, ingestion pipeline design, or OCR-QA process until real Vellum-VPS samples are inspected. Handle by treating "first OCR batch arrives" as a mandatory research/inspection checkpoint before building the full ingestion parser (per PITFALLS.md Pitfall 4 and ARCHITECTURE.md build-order step 1).
- **Total redirect-map size not yet known:** Determines whether `_redirects` alone suffices or Bulk Redirects is required from the start. Handle by completing the reconciled URL inventory (Phase 1) as early as possible and re-checking against the account's actual dashboard-confirmed Bulk Redirects quota before Phase 5 is planned in detail.
- **PDF file sizes not yet measured:** Stack research assumes scanned PDFs "commonly run 5-20MB+"; if actual sizes are smaller, the R2-vs-repo tradeoff calculus could shift (though R2 remains recommended regardless, given the 346-file count alone). Handle by sampling actual PDF sizes during Phase 1/3 to confirm the R2 approach and rule out any file exceeding Cloudflare Pages' 25 MiB cap if ever considered for direct hosting.
- **Whether britishreformed.org currently has live email:** Directly affects DNS cutover risk (Pitfall 5). Handle during Phase 1's DNS zone audit — confirm whether "Contact Us"/info@ addresses resolve through real mail hosting before cutover planning.

## Sources

### Primary (HIGH confidence)
- Astro official docs — Content Collections, Content Collections API Reference, Cloudflare deploy guide
- Cloudflare official docs — Pages Limits, Pages Redirects, R2 static-asset-storage tutorial, R2 public buckets, Bulk Redirects announcement blog
- npm registry (`npm view`) — live version/engine verification for astro, @astrojs/mdx, @astrojs/react, @astrojs/sitemap, pagefind, astro-pagefind, astro-og-canvas, lucide-astro, motion, @tailwindcss/vite
- Cloudflare press release + Astro's own announcement — Jan 2026 Cloudflare/Astro acquisition
- Squarespace official support docs — SEO after migration, site export limitations, Google Workspace MX records, DNS records for email
- Pagefind official site + docs (filtering) — search architecture, faceting, index size at scale
- ACL Anthology (OCR++), arXiv preprints — peer-reviewed sources on multi-column/footnote extraction and ancient Greek OCR

### Secondary (MEDIUM confidence)
- WebSearch comparisons — Cloudflare Pages vs Workers 2026, Astro vs Eleventy vs Hugo, page-count scaling thresholds
- Academic/sermon-archive site analogs (WTJ, JMEMS, SermonAudio, MLJ Trust) — feature-landscape extrapolation
- Digital magazine platform comparisons (3D Issue, eMagazines) — differentiator/anti-feature patterns
- DNS migration and TTL best-practice guides (InMotion Hosting, DCHost)

### Tertiary (LOW confidence)
- Cloudflare Community thread reporting `_redirects` failures at ~444 lines (single unresolved report, not officially corroborated)
- Cloudflare Community thread on Free-plan Bulk Redirects quota discrepancies (multiple threads, still community-sourced not official)

---
*Research completed: 2026-08-10*
*Ready for roadmap: yes*
