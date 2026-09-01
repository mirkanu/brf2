---
title: Phase 2b — Infra & SEO
phase: 2b
last-updated: 2026-09-01
status: ready (DO NOT START without resolving OD-2/OD-3)
docs: [ROADMAP.md](ROADMAP.md), [STATE.md](STATE.md), [PLAN-2.md](PLAN-2.md)
---

## Open decisions (BLOCK Phase 2b start)

| # | Decision | Status | Resolution |
| --- | --- | --- | --- |
| OD-1 | Conference list completeness | ✅ Resolved 2026-09-01 | Complete at <https://brf2.pages.dev/conferences/> (43 entries). |
| OD-2 | Asset hosting variant | ⏳ PENDING | Confirm all PDF/image assets live in `public/img/` + `public/assets/` before pointing R2 DNS at Cloudflare Pages. Audit before WS-2.7. |
| OD-3 | PDF strategy | ⏳ PENDING (scope confirmed, run blocked) | Scope: all 73 journal issue PDFs + several hundred article PDFs from Squarespace export. Bucket `brf`, prefixes `pdfs/issues/` + `pdfs/articles/`, free tier, upgrade trigger >8 GB. Upload blocked on `CLOUDFLARE_API_TOKEN`. |

## Workstreams in scope (this iteration)

### WS-2.1 — Sitemap.xml (no blockers)

- Add `@astrojs/sitemap` integration to `astro.config.mjs`
- Output `/sitemap-index.xml` + `/sitemap-0.xml` (verify both 200 XML)
- Update `public/robots.txt` to point at the live sitemap-index URL
- Smoke test: `curl -I https://brf2.pages.dev/sitemap-index.xml`

### WS-2.4 — R2 PDF upload (BLOCKED on OD-2 + token)

- Bulk upload all journal issue PDFs + all article PDFs from `/Scratch/brf-squarespace-export.zip` to R2 bucket `brf`
- Prefixes: `pdfs/issues/`, `pdfs/articles/`
- Rewrite `pdfUrl` / `pdfLink` in content JSONs to point at the R2 public host
- Blockers: `CLOUDFLARE_API_TOKEN` secret; R2 public bucket binding (DNS); OD-2 final asset audit

### WS-2.7 — Legacy redirects + DNS audit (no blocker)

- `public/_redirects` (Cloudflare Pages): 301 rewrites for legacy 404 paths
- `public/_headers`: cache headers for `/_astro/*`
- DNS audit: confirm `brf2.pages.dev` resolves to the right Cloudflare Pages CNAME

### WS-2.9 — RSS + JSON-LD (script-generated, no blockers)

- `/rss.xml` via `@astrojs/rss` — feeds journal / conferences / podcasts
- Per-page JSON-LD in `Site.astro`:
  - `Article` for `/journal/issue-*/` and `/journal/issue-*/[slug]/`
  - `Event` for `/conferences/[year]/`
  - `PodcastEpisode` for `/podcasts/[...slug]/`

## Out of scope (carry to later phase)

| Stream | Reason |
| --- | --- |
| WS-2.2 (Site-wide redirects from old site) | Pending location of old site archive. |
| WS-2.5 (Conference review pages) | Schema rewrite blocked on user providing 43 missing fields. |
| WS-2.6 (Authors taxonomy) | Blocked on user confirming `authorSlugs` policy. |
| WS-2.8 (Subdomain split) | Confirm with Manuel which (if any) subdomains. |

## Exit criteria

1. `GET /sitemap-index.xml` and `GET /sitemap-0.xml` return 200 XML; robots.txt points at the live index.
2. `GET /rss.xml` returns 200 XML.
3. JSON-LD parses on `/journal/issue/*`, `/conferences/[year]/`, `/podcasts/[...slug]/`.
4. PDF page-weight on the live site ≤ 50% of the original 1.7 GB estimate after R2 re-host.
5. Legacy redirects in place; DNS audit clean.

## Execution order

WS-2.1 → WS-2.9 → WS-2.7 → WS-2.4 (last, requires manual token).
