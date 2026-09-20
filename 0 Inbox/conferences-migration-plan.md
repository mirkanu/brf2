# Status: Draft plan, awaiting review

> **This is a proposal for review — no code has been written yet.** Final plan will be saved to `1 Projects/brf2/docs/agent-handbook/` after Manuel approves.

# Conference migration plan
**Phase:** 2024 finalisation first, then sweep SquareSpace
**Modes:** MP3 + YouTube per recording
**Concurrency:** Solo, iteration-by-iteration on preview branches
**Authoritative goal (You clarified):**
- Each item closed by default.
- When a user clicks a speech → the uncollapsed section shows the MP3 player first, then the YouTube embed below it.
- 2024 finalised first; **do not touch any other conference until 2024 is signed off.**
- Use the MCP Cloudflare bucket to host MP3s, scrape YouTube playlist only when per‑video IDs are actually needed.

## Visual example of a recording item (target)

```
[ + Opening Address ]   ← closed by default, small + indicator
        (click to expand)

[ – Opening Address ]   ← expanded, shows both
    [ ▶ ▷▷ 00:00 / 42:15 ………… ]   MP3 player (playback, scrub, speed)
    [ YouTube embed 16:9         ]   YouTube fallback
```

**Behaviour after the change:**
- Items are collapsed until the user opens one.
- On open, the user sees **MP3 first**, **YouTube second** (each only renders if the corresponding URL exists).

---

## Phase 0 — 2024 finalisation (current focus)

**Inputs already in the repo**
- `src/content/conferences/2024.json` exists with 10 recordings.
- 10 MP3s are uploaded to R2 at `audio/conferences/2024/{slug}.mp3`.

**Outstanding work for 2024**
1. **Renderer order fix (small)** — In `src/pages/conferences/[year].astro`, currently the rendering order is YouTube first, MP3 second. Swap so MP3 renders first, YouTube second. This matches the visual above. One paragraph of source change.
2. **Discoverability of 2024**
   - Add 2024 to the homepage's past-conference preview or future-conference list.
   - Verify `/conferences/2024/` produces a clean page (build green, no 404s for the 10 audio URLs).
3. **Reviews (deferred — placeholder)** — skip for now, render a placeholder.
4. **YouTube playlist URL field** — currently only `youtubePlaylistUrl` and individual `youtubeId` are stored; persist the playlist URL in the JSON so a "View full playlist on YouTube" link can appear.

**Done definition for Phase 0**
- [ ] Order in `[year].astro` is MP3 → YouTube
- [ ] `/conferences/2024/` returns 10 working audio files, no 404s
- [ ] MP3 first, YouTube second verified on the preview URL
- [ ] 2024 referenced from homepage

---

## Phase 1 — Per‑conference migration pattern

Once the 2024 page is approved, repeat for each remaining conference year:

1. **Audit** the conference on `britishreformed.org`. Note:
   - Per-talk audio URLs and YouTube IDs.
   - Reviews, talks, descriptions.
2. **Create or update JSON** in `src/content/conferences/`:
   - title, year, venue, dates, description.
   - `recordings[]` with `{title, kind, youtubeId, mp3Url}`.
3. **Host audio on R2** under `audio/conferences/{year}/{slug}.mp3`.
4. **Verify build + preview** before moving to the next year.

---

## Phase 2 — Reviews & deep linking

(Parked — reviews are deferred. When we come back:)
- Reviews live under `/conferences/{year}/review/{slug}/` or fold into the year page.
- Render reviews from `britishreformed.org` PDFs currently served via `/s/Pp...` URLs; for now leave a placeholder.

---

## Open questions / parking lot

- **Stale 2024 review JSON** (currently linked to 2022 stubs). Leave them — placeholder per Manuel's instruction.
- **Mark of the Beast MP3** — Will search for and re-classify if found.

---

## What I did first

I worked backward from the live `/conferences/2024/` preview:

1. Read the current renderer at `src/pages/conferences/[year].astro`.
2. Read the schema at `src/content.config.ts` (it currently allows `youtubePlaylistUrl` per year, and per-recording `youtubeId` + `mp3Url`).
3. Read the data at `src/content/conferences/2024.json` (10 recordings, all `mp3Url`s present, no `youtubeId` yet).
4. Confirmed 2024 plays a full YouTube playlist only via `youtubePlaylistUrl` — per‑video `youtubeId`s weren't filled in for 2024.
5. This means **right now 2024 already satisfies "MP3 + YouTube per speech"** if I fill in each recording's `youtubeId`. Playlist scraping was started, but it's optional as long as the playlist URL is shown.
