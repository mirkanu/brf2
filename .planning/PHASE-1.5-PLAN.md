# Phase 1.5 plan — R2 Sizing Audit

**Status:** Complete. Outcome in `PHASE-1.5-SIZING.md`.

## Goal

Decide whether the journal + conference media corpus fits Cloudflare R2's free tier, and pick a hosting variant for Phase 2.

## Tasks

| ID | Task | Owner | Status |
| --- | --- | --- | --- |
| T1 | Harvest distinct MP3 URLs from conferences export; HEAD-probe each | child | done — 16/16 ok, 214.07 MB |
| T2 | Harvest distinct PDF URLs from blog export + local pilot; HEAD-probe each | child | done — 112 remote + 3 local |
| T3 | Download 1 MP3 sample + 2 PDF samples, verify bytes match `Content-Length` | main | done — samples/ |
| T4 | Derive full-corpus projection (2–3 GB, ceiling 5 GB) and pick tier | main | done — R2 free |
| T5 | Pick asset hosting variant (A vs B) | main | done — B (R2 + custom domain) |
| T6 | Document coverage gaps (16/220 MP3, 7/76 issue PDF, 32/36 article PDF) | main | done — PHASE-1.5-SIZING.md |

## Decisions recorded

- Tier: **R2 free tier** (within 10 GB / 10M reads / 1M writes budget)
- Variant: **B — R2 bucket `brf-media` + custom domain `cdn.britishreformed.org`**

## Files

- Plan: `.planning/PHASE-1.5-PLAN.md` (this file)
- Report: `.planning/PHASE-1.5-SIZING.md`
- Data: `scratch/phase-1.5/{mp3,pdf}-bytes.csv`
- Samples: `scratch/phase-1.5/samples/`
- Scripts: `scripts/sizing-audit/harvest-{mp3,pdf}.ts`

## Backlog for Phase 2

1. Source 200+ missing conference MP3s (only 16 in export).
2. Source 67+ missing issue PDFs (69 export URLs are dead).
3. Create R2 bucket, wire `cdn.britishreformed.org` custom domain.
4. Bulk-migrate ~1k files, update frontmatter.