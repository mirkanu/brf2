---
title: Phase 2b — Infra & SEO
phase: 2b
date: 2026-09-02
status: executing
supersedes: PLAN-2.md (2026-09-01, predates 2a)
docs: [ROADMAP.md](ROADMAP.md), [STATE.md](STATE.md), [PHASE-2A.md](PHASE-2A.md), [PHASE-2B-LOG.md](PHASE-2B-LOG.md)
---

# Phase 2b — Infra & SEO

## What shipped in 2a (already done)

- WS-2.3 Conference descriptions + Reviews section
- WS-2.6 README + R2 reference doc
- Perf/a11y polish (Lighthouse perf 100, a11y ≥95 across five routes)
- `public/robots.txt` with sitemap pointer

## Scope for this dispatch

| ID | Workstream | Blocker | Notes |
| --- | --- | --- | --- |
| WS-2.1 Sitemap | DONE | — | `scratch/phase-2/gen-sitemaps.mjs` already wired into `postbuild`; produces `sitemap-index.xml` + `sitemap-1.xml`; robots.txt points at live URL. **Verify, do not rewrite.** |
| WS-2.9 RSS + per-page JSON-LD | NONE | — | Build `@astrojs/rss` feed; replace blanket Organization JSON-LD with per-route typed JSON-LD (Article for journal pages, Event for conference years, PodcastEpisode for podcasts). |
| WS-2.7 Redirects + DNS audit | NONE | — | Generate `_redirects` from `legacyPath` fields in issues + articles; add cache headers via `_headers`; confirm `brf2.pages.dev` DNS. |
| WS-2.4 R2 PDF upload | **CLOUDFLARE_API_TOKEN with `Account → R2: Edit`** | Manuel dropping the token into Settings → Advanced Secrets as `CLOUDFLARE_API_TOKEN`. |

## Execution order

1. **Now (no token needed):** WS-2.9 (RSS + JSON-LD) — biggest infra gap.
2. **In parallel:** WS-2.7 (redirects + DNS audit) — agent can run autonomously.
3. **After token lands:** WS-2.4 (R2 upload) — long-running dispatch.

## Exit criteria

- [ ] `GET /rss.xml` returns 200 XML with feeds for journal / conferences / podcasts
- [ ] Per-page JSON-LD on `/journal/issue-*/`, `/journal/issue-*/[slug]/`, `/conferences/[year]/`, `/podcasts/[...slug]/`
- [ ] `public/_redirects` generated from `legacyPath` fields, deployed
- [ ] DNS audit confirms `brf2.pages.dev` resolves to Cloudflare Pages
- [ ] `CLOUDFLARE_API_TOKEN` in Secrets with R2: Edit scope → WS-2.4 starts

## Parks

- WS-2.5 (Lighthouse on PDFs) — blocked on WS-2.4 (need R2 URLs).
- WS-2.6 (Authors taxonomy) — blocked on user policy confirmation.
- WS-2.8 (Subdomain split) — blocked on user confirmation.
- DNS cutover, decommission Squarespace, custom domain — Phase 5.
