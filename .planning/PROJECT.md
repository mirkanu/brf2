# Project

## What This Is

Rebuild of britishreformed.org (BRF) — Reformed Baptist resource hub originally on Squarespace — onto Astro 7 + Cloudflare Pages. Live at brf2.pages.dev.

## Core Value

Every piece of existing BRF content (journal archive, conferences, literature, translations) is live on the new platform, fully reachable from its old Squarespace URL via redirect, with zero ongoing server/plugin maintenance required.

## Deployment Reality (verified 2026-08-29)

`brf2` is not just a planning repo — it's a live deployment. Cloudflare Pages project `brf2` was created 2026-08-17 and serves https://brf2.pages.dev. As of 2026-08-29 it has:

- Layouts: `Site` + Header (with mobile drawer + Donate) + Footer + ThemeToggle
- 8 routes: `/`, `/about`, `/beliefs`, `/conferences`, `/contact`, `/donate`, `/journal`, `/journal/[slug]`
- 1 Zod-typed content collection: `articles` (glob loader, schema frozen against 3 pilot samples)
- 3 pilot articles shipped with `.md` body + `.json` metadata + original PDF
- Dark/light/auto theming via Tailwind 4 theme tokens
- Build: `npm install && npm run build` — operational

Phase 2's "shell" therefore is half-done. What remains is conference/literature collections, the 18+ pages of conference content, sitemap/RSS/OG/JSON-LD generation, and Lighthouse/WCAG audits. See `STATE.md` for the full delta.

## Repo Lineage

| Repo | State | Use |
|------|-------|-----|
| `brf-site-migration` | Archive — no `package.json`, planning-only | Historical reference for requirements/research |
| `brf` | Astro 7.2 + Zod, planning + research, never executed | Source of requirements, roadmap, research |
| **`brf2`** | **Live** — what Cloudflare Pages serves (brf2.pages.dev) | **Canonical working repo** |

Phase 0 sync note: `brf2/.planning/` was created from `brf/.planning/` (newest source). `brf-site-migration/.planning/` is archived for reference only.

## Requirements

See `REQUIREMENTS.md` (25 v1 + 6 v2 deferred items, ported from `brf`).

## Roadmap

See `ROADMAP.md` (5 phases, revised 2026-08-29 against actual deployment state).

## State

See `STATE.md`.

## Key Decisions

Log significant decisions as they're made (one-line entry, dated):

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-29 | `brf2` is canonical (deployed to Pages) | Cloudflare Pages project `brf2` → brf2.pages.dev |
| 2026-08-29 | `.planning/` synced from `brf` (newest source) | `brf` last pushed 2026-08-12; `brf-site-migration` last pushed 2026-08-10 |
| 2026-08-29 | `brf-site-migration` treated as archive | No `package.json`, planning-only |
| 2026-08-29 | ROADMAP Phase 2 rewritten as in-progress (pilot shipped) | Previous ROADMAP assumed from-scratch build; `brf2` actually shipped a pilot 2026-08-17 |

## Open Questions / Concerns

- (Move here as they arise; resolve before they block work.)