# Project status — BRF2 Cloudflare Pages

## Live state — 2026-09-04 10:53 UTC

- **Live URL**: https://brf2.pages.dev
- **Latest successful deploy**: `facd281c` (commit `3d0dedd`, "chore: trigger Cloudflare rebuild") — **DOES NOT contain the scroll-margin fix**
- **Build in progress**: `77287e03` (commit `abe68f8` "chore: re-arm Pages webhook (third attempt)") — has the fix, build stage still active after ~7 min
- **Styling commit not yet live**: `617c174` (style(scroll): offset footnote/heading anchors below sticky nav) needs to ride in on top of `77287e03`

## Root cause of the deploy jam

The Cloudflare Pages build hook fired on the empty `chore:` commit (`3d0dedd`), but the actual styling commit (`617c174`) landed on `main` *during* the resulting build (10:08). Pages never rebuilt for it — the webhook didn't re-fire. Ad-hoc deployments created via the API were `skipped` because Pages superseded them with a GitHub-push-triggered deployment for a more recent commit. The build pipeline is now slow but progressing — `77287e03` is the right one and should land within the next few minutes.

## What I tried

1. Empty `chore:` commits (3 attempts) — the historical fix. Third one finally armed the webhook for `abe68f8`.
2. Pages retry API on the original deployment — replayed `3d0dedd`, not helpful.
3. Ad-hoc deployment via `POST /deployments` — explicitly `skipped` by Pages once the GitHub push superseded it.

## Resolution

When `77287e03` finishes:
- Verify the new live CSS contains `scroll-margin-top: 6rem` for `.footnote-anchor` and `[id]:not(body)`.
- Re-check footnote anchors in BRJ77 in a browser session.

## Known blockers (unrelated)

- 28 files in `scratch/phase-2/` deleted locally, uncommitted. Cleanup pending.
- `AGENTS.md`, `STATUS.md`, `package.json` have uncommitted changes in the working tree.

## Previous status (historical)

... (kept for reference)
