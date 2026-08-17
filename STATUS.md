# Status — brf2 rebuild

Live snapshot of feature status. Manuel reviews before each phase gate.

## Locked decisions (since project start)

- Stack: Astro 7 + Tailwind 4, hosted on Cloudflare Pages.
- Content: file-based via Astro content collections (`src/content.config.ts`).
- Search: Pagefind for in-site local search (free, unlimited, runs in browser).
- Future: Algolia DocSearch if external full-text demand grows.
- CMS editorial: Decap CMS (Sanity Studio + Strapi rejected — JS dependency, hosted data, friction with content-as-files mandate).
- Podcast: single combined feed `feed/podcast.xml`.
- Migration: ~575 articles from Squarespace export, scraped PDFs from canonical `/brj-articles` URLs.
- Pilot gate: 2-3 articles must be approved before bulk import.

## Current backlog

| Phase | Item | Owner | State | Notes |
|-------|------|-------|-------|-------|
| 0 | GitHub repo `brf2` | Manuel | pending | needs gh auth |
| 1 | Three pilot articles end-to-end | Josie | next | scrape + write content collection entries |
| 2 | Bulk article migration | Josie | after pilot | 575 entries via scraper |
| 3 | Decap CMS mounted at `/admin` | Josie | after pilot approval | PR-based editorial flow |
| 4 | Pagefind index on build | Josie | with articles | incremental |
| 5 | Cloudflare Pages deploy | Manuel | final | project name + DNS |

## Risks

- Squarespace export OCR quality varies. Some scanned pre-2015 issues will need manual transcription — flag for Manuel review batch by batch.
- MP3 lecture files on Squarespace may be hosted externally and not in the export ZIP. Confirm via direct scrape.
- Cloudflare Pages does not allow image transformations without custom code. Use Apline.js + LQIP for image optimisation if needed.

## What's next

Pilot articles. Three chosen to cover variation: long-form theological article (1 issue 73), short announcement (~300 words), book review. Then bulk-migration begins.
