# Architecture Research

**Domain:** Large static content-archive site (400+ long-form articles, PDF companions, AI-agent-authored, Cloudflare Pages)
**Researched:** 2026-08-10
**Confidence:** HIGH (Cloudflare Pages limits, Astro content collections, Pagefind — all verified against official docs/current sources). MEDIUM on redirect-map sizing (depends on unknown final URL inventory, flagged as a gap).

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                     CONTENT PIPELINE (offline, one-off/batch)          │
│  ┌────────────────┐   ┌───────────────────┐   ┌────────────────────┐ │
│  │ Vellum-VPS OCR  │→  │ Metadata extractor │→ │ MDX/data file writer│ │
│  │ (SSH pull)      │   │ (article boundary, │   │ (schema-conformant  │ │
│  │                 │   │  author/issue/date)│   │  files into repo)   │ │
│  └────────────────┘   └───────────────────┘   └──────────┬─────────┘ │
└──────────────────────────────────────────────────────────┼────────────┘
                                                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    CONTENT LAYER (git repo, source of truth)           │
│  content/articles/  content/issues/  content/authors/  content/pages/  │
│  content/conferences/  content/literature/         (MDX + YAML/JSON)   │
│              ↓ validated against Zod schemas in content.config.ts      │
└──────────────────────────────────────────────┬──────────────────────┬─┘
                                                 ▼                      │
┌────────────────────────────────────────────────────────────────┐    │
│                    BUILD LAYER (Astro static build)              │    │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌────────────────┐ │    │
│  │ArticlePage │ │IssueIndex │ │ConferenceP │ │Author/TopicIdx  │ │    │
│  │ template   │ │ template  │ │ template   │ │ (aggregate)     │ │    │
│  └────────────┘ └───────────┘ └────────────┘ └────────────────┘ │    │
│                          ↓ astro build → dist/                   │    │
│                  ┌──────────────────────┐                        │    │
│                  │ Pagefind (postbuild)  │  ← indexes dist/*.html │    │
│                  │ → dist/pagefind/*     │                        │    │
│                  └──────────────────────┘                        │    │
└───────────────────────────┬──────────────────────────────────────┘    │
                             ▼                                          │
┌───────────────────────────────────────────────────────────────────┐  │
│                    DELIVERY LAYER (Cloudflare, edge)                │  │
│  ┌────────────────────┐   ┌───────────────────┐  ┌───────────────┐│  │
│  │ Cloudflare Pages    │   │ Cloudflare R2      │  │ _redirects /  ││◄─┘
│  │ (HTML/CSS/JS/small  │   │ (346+ PDFs, audio, │  │ Bulk Redirects││
│  │  images, dist/)     │   │  via custom domain)│  │ (301 map)     ││
│  └────────────────────┘   └───────────────────┘  └───────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| Content pipeline scripts | Pull OCR text from Vellum-VPS, split multi-article PDFs, extract title/author/issue/date, write schema-conformant MDX + frontmatter | One-off/batch Node scripts, run manually per issue-batch, not part of `astro build` |
| Content collections (`content.config.ts`) | Define + enforce frontmatter contract (Zod schema), expose typed queries to templates, cross-link via `reference()` | Astro Content Collections (`glob()` loader for MDX, `file()`/JSON loader for `authors`/`issues` data) |
| Article template | Render one article: full text + metadata + PDF download link + issue/author backlinks | `src/pages/journal/[...slug].astro` driven by `getStaticPaths()` over `articles` collection |
| Issue index template | List all articles in one issue, in original print order | `src/pages/journal/issues/[issue].astro` driven by `issues` collection |
| Author/Topic index pages | Cross-cutting aggregate views (all articles by author X, by tag Y) | Static route(s) built by grouping the full `articles` collection at build time |
| Conference template | Video embed (YouTube iframe) + R2 audio link + description | `src/pages/conferences/[slug].astro` over `conferences` collection |
| Search page | Client-side full-text search UI | Pagefind UI component/JS, mounted on a static `/search` page, reads `dist/pagefind/` index generated postbuild |
| Redirect layer | Map every reachable old Squarespace URL (pattern + literal) to its new-site equivalent, 301 | `_redirects` file in build output (or Bulk Redirects via dashboard/API if the map exceeds ~1,900 lines) |
| R2 buckets | Serve large binaries (PDFs, conference audio) without inflating the Pages deployment or git repo | Public bucket + custom subdomain (e.g. `files.britishreformed.org`), zero egress fees |

## Recommended Project Structure

```
repo-root/
├── content/                          # Astro content collections root
│   ├── articles/                     # 413+ MDX files, one per article
│   │   ├── issue-01/
│   │   │   ├── the-covenant-of-grace.mdx
│   │   │   └── reflections-on-providence.mdx
│   │   ├── issue-02/
│   │   │   └── ...
│   │   └── issue-77/
│   ├── issues/                       # 77 lightweight data entries (issue metadata)
│   │   ├── 01.yaml                   # { number, title/theme, publicationDate, coverNote }
│   │   └── ...
│   ├── authors/                      # deduped author records, referenced by articles
│   │   ├── john-doe.yaml             # { name, bio, honorific, slug }
│   │   └── ...
│   ├── conferences/                  # 18+ MDX/data files
│   ├── literature/                   # ~10 book/pamphlet entries (mostly external links)
│   ├── news-alerts/                  # BRF News Alert archive
│   └── pages/                        # About, Doctrinal Basis, Membership, Contact (static prose)
├── public/                           # small, few, static: logo/banner, favicons, small site images
├── src/
│   ├── content.config.ts             # Zod schemas + collection loaders (the pipeline↔template contract)
│   ├── layouts/                      # ArticleLayout.astro, IssueLayout.astro, ConferenceLayout.astro, PageLayout.astro
│   ├── components/                   # PdfDownloadLink, AuthorCard, TopicTagList, SearchBox, etc.
│   └── pages/
│       ├── journal/
│       │   ├── [...slug].astro       # single article route
│       │   ├── issues/[issue].astro  # issue index route
│       │   ├── authors/[author].astro
│       │   └── topics/[topic].astro
│       ├── conferences/[slug].astro
│       ├── literature/index.astro
│       ├── search.astro
│       └── (about|doctrinal-basis|membership|contact).astro
├── scripts/
│   ├── ingest/                       # OCR-pull + metadata-extraction + MDX-writer pipeline (offline)
│   └── redirects/                    # generates `_redirects` from a checked-in redirect-map data file
├── _redirects                        # committed at repo root or generated into dist/ at build time
└── astro.config.mjs
```

### Structure Rationale

- **`content/articles/issue-NN/`:** Foldering by issue mirrors the physical source (one OCR batch per issue, some source PDFs containing multiple articles) — this matters because the content pipeline is issue-by-issue batch work done by an AI agent, and folder-per-issue keeps ingestion progress visually auditable ("issue-47/ has 6 of 8 articles present") without needing to query frontmatter. It does **not** replace frontmatter-based `issue`/`author`/`topic` fields — those remain the query mechanism for cross-cutting views (by author, by topic), since folder location alone can't answer "all articles by Author X across all issues."
- **`content/authors/` and `content/issues/` as separate data collections:** Author bios/photos and issue metadata (theme, publication date) are reused across many articles. Storing them once and referencing (`reference('authors')`, `reference('issues')`) from each article avoids duplicating author bio text in 413 files and gives a single place to fix a typo in an author's name.
- **`content/pages/` for standalone prose (About, Doctrinal Basis, etc.):** Small, fixed set (~5-6) that doesn't need collection-level querying — could alternatively be individual `.astro` files in `src/pages/`, but keeping them as content files maintains "everything editorial lives under `content/`, only templates live under `src/`" as a clean mental model for an AI agent making bulk edits.
- **`public/` kept deliberately small:** Only assets that must ship as literal files with fixed paths (logo, favicon) belong here. PDFs and audio are explicitly excluded — see Binary Assets below.
- **`scripts/ingest/` separated from the Astro app:** The OCR pipeline is a distinct, occasionally-run process with its own dependency graph (SSH client, PDF/text parsing) and should not be part of `astro build`. Keeping it in `scripts/` makes the boundary explicit: pipeline writes files into `content/`, Astro only ever reads `content/`.

## Architectural Patterns

### Pattern 1: Content Collections as the pipeline↔template contract

**What:** Define one Zod schema per collection in `content.config.ts`. The content pipeline's job is to produce files that pass this schema; the templates' job is to consume only what the schema guarantees exists.
**When to use:** Any time content is generated by a script/agent rather than hand-typed by a human in a WYSIWYG editor — schema validation at build time catches malformed frontmatter (bad dates, missing required fields, wrong issue-number type) before it ships, which is the closest thing to "editorial review" this pipeline gets.
**Trade-offs:** Requires freezing the schema fairly early (changing it later means re-touching many files), but that's a feature here — Astro's own docs describe validated collections as "essential for large blogs with hundreds of articles."

**Example:**
```typescript
// src/content.config.ts
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './content/articles' }),
  schema: z.object({
    title: z.string(),
    author: reference('authors'),               // dedupes bio/photo
    coAuthors: z.array(reference('authors')).optional(),
    issue: reference('issues'),                  // relational link
    issueNumber: z.number().int(),                // denormalized for cheap sort/display
    publicationDate: z.coerce.date(),
    topics: z.array(z.string()).default([]),      // free-form tag list
    pdfUrl: z.string().url(),                      // points at R2, not a repo path
    originalUrl: z.string().optional(),             // old Squarespace URL, for redirect QA
    status: z.enum(['draft', 'needs-review', 'published']).default('draft'),
  }),
});

const issues = defineCollection({
  loader: file('./content/issues/index.yaml'),      // or glob over per-issue files
  schema: z.object({ number: z.number(), theme: z.string().optional(), publicationDate: z.coerce.date() }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './content/authors' }),
  schema: z.object({ name: z.string(), bio: z.string().optional() }),
});

export const collections = { articles, issues, authors };
```

### Pattern 2: `status` field as the AI-agent publication gate

**What:** A `status` (or `draft: boolean`) frontmatter field lets the ingestion pipeline write files incrementally (OCR done, metadata extracted, not yet human/agent-reviewed) without them appearing live. Templates and `getStaticPaths()` filter to `status: 'published'` only.
**When to use:** Specifically because this project's content is authored entirely by an AI agent with no human editor in the loop — there is no separate "CMS draft mode" to lean on, so the filesystem/frontmatter has to carry that state itself.
**Trade-offs:** One more field to keep consistent across 413 files, but it's the cheapest way to let ingestion and publishing proceed at different paces (e.g., commit issue 47's articles as `needs-review` while issue 12 is already `published`) without needing feature branches per issue.

### Pattern 3: R2 for binaries, git for text — hard split, not a spectrum

**What:** PDFs (346+) and conference audio never enter the git repo or the Astro build output. They live in Cloudflare R2, referenced by URL in frontmatter (`pdfUrl`, `audioUrl`). Only text (MDX), small structured data (YAML/JSON), and a handful of small brand images (logo, favicon) go through Astro's static build / Pages deployment.
**When to use:** Any static site where binary assets are numerous and/or individually large. Confirmed by Cloudflare's own guidance: Pages deployments cap at 20,000 files / 25 MiB per file (free tier; 100,000 files on paid with the `PAGES_WRANGLER_MAJOR_VERSION=4` opt-in), and a Cloudflare staff response directly recommends R2 for large files. R2 also has zero egress fees, which matters for a public archive with recurring PDF downloads.
**Trade-offs:** Adds a second deployment surface (R2 bucket + custom domain) to manage alongside Pages, and PDFs are not version-controlled by git — but scanned/OCR'd journal PDFs are unlikely to average under a few MB each, and 346 of them committed to git risks both the 25 MiB per-file Pages asset limit on the larger scans and GitHub's "keep it under 1-5 GB" repo-size guidance. Git LFS was considered and rejected: community reports show inconsistent behavior with larger LFS files on Cloudflare Pages, and LFS still counts against the Pages file-count limit at deploy time.

## Data Flow

### Content ingestion flow (pipeline → repo)

```
Vellum-VPS (OCR output, format TBD)
    ↓ SSH pull (scripts/ingest/)
Article-boundary + metadata extraction (per multi-article PDF)
    ↓
MDX file + frontmatter written to content/articles/issue-NN/<slug>.mdx
    ↓ (status: needs-review)
PDF uploaded to R2 bucket, URL written back into frontmatter as pdfUrl
    ↓
git commit → status flipped to 'published' when ready
```

### Build/render flow (repo → live site)

```
git push → Cloudflare Pages build triggered
    ↓
astro build
    ├─ content.config.ts validates all frontmatter against Zod schemas (fails build on bad data)
    ├─ getStaticPaths() over `articles` (status=published only) → one HTML page per article
    ├─ getStaticPaths() over `issues` → one index page per issue
    ├─ aggregate pass over `articles` → author/topic index pages
    └─ dist/ produced
    ↓ postbuild
pagefind --site dist/   → indexes rendered HTML → dist/pagefind/*
    ↓
Cloudflare Pages deploys dist/ (+ `_redirects`) to edge
```

### Key Data Flows

1. **Text content:** Vellum-VPS → ingestion script → `content/` (git, source of truth) → Astro build → static HTML on Pages. One-directional; nothing writes back to Vellum-VPS.
2. **Binary assets:** OCR'd source PDF → R2 upload (separate from git) → URL stored in article frontmatter → Astro template renders a download link; the PDF bytes never pass through the Astro build.
3. **Search index:** Rendered HTML (build output) → Pagefind CLI → static index files → client-side JS fetches index fragments on demand at runtime. Pagefind never touches `content/` directly — it only sees what templates actually rendered, which is why template HTML structure (headings, semantic markup) should stabilize before tuning search relevance.
4. **Redirects:** Old-URL inventory (crawled from live Squarespace site, separate research effort) + new-site slug list (derived from `content/articles` + `content/issues` + `content/conferences` at build/generation time) → a redirect-map data file → generated `_redirects` (or Bulk Redirects) → served at Cloudflare's edge before any Pages asset lookup.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| This project (~500-600 total pages: 413 articles + 77 issue pages + 18 conferences + ~15 misc) | Plain Astro SSG is comfortably sufficient. Community reports show Astro SSG handling 300k+ pages with build-time optimization; this project is roughly 2 orders of magnitude below where SSG build time becomes a real concern. No hybrid rendering, ISR, or on-demand generation needed. |
| If article count grew 5-10x (2,000-5,000 articles) | Still well within Pagefind's stated comfort zone (tested to 10,000+ pages, <300kB total search payload). Astro build time would grow roughly linearly with page count; watch for accidental per-page network/API calls inside components (the documented cause of 30-minute Astro builds elsewhere) rather than page count itself. |
| If total repo/deployment file count approached 20,000 | Only relevant if PDFs were mistakenly brought back into the repo/Pages deployment. With PDFs on R2 from the start, this project's file count (low thousands including Pagefind index shards and small images) stays far under both the free-tier 20,000 limit and the paid-tier 100,000 limit. |

### Scaling Priorities

1. **First (and effectively only) bottleneck at this project's size:** getting the content pipeline to actually run cleanly across 346 source PDFs with correct article-boundary/metadata extraction — this is a data-quality problem, not an architectural scaling problem. The static-site architecture itself has enormous headroom above 500-600 pages.
2. **Second, minor:** `_redirects` file line budget (2,000 static + 100 dynamic = 2,100 total). Not a scaling concern per se, but worth pre-computing: ~500 individual old→new mappings (articles + issues + conferences) plus a few dozen category/pattern redirects stays comfortably under budget; only becomes relevant if literal per-item redirects are needed for far more than the current content count.

## Anti-Patterns

### Anti-Pattern 1: Committing PDFs (or using Git LFS for them) directly into the Pages-deployed repo

**What people do:** Treat the git repo as the single source of truth for *all* files, including the 346+ scanned PDFs, because "no database, everything in git" sounds like it should include binaries too.
**Why it's wrong:** Risks the Pages 25 MiB per-file limit on larger scans, inflates repo clone time well past GitHub's "under 1-5 GB" guidance, and Git LFS has documented inconsistency with larger files on Cloudflare Pages specifically. None of this is necessary — "content authored as files in git" (the project's actual constraint) is satisfied by the *text* (MDX/frontmatter) living in git; the binaries can live in R2 and simply be referenced by URL.
**Do this instead:** Git holds text + metadata + a `pdfUrl`/`audioUrl` reference. R2 holds the actual bytes, fronted by a custom subdomain.

### Anti-Pattern 2: Folder-by-issue as the only relational structure (no reference fields)

**What people do:** Organize `content/articles/issue-NN/*.mdx` and stop there, relying on folder path alone to answer "which issue is this article in," with author/topic as free-text strings duplicated per file.
**Why it's wrong:** Answering "all articles by Author X" or "all articles tagged Providence" requires scanning every file's frontmatter anyway (folder location doesn't help), and duplicated author names invite inconsistency (e.g. "J. Doe" vs "John Doe" fragmenting the author index) — especially risky when an AI agent is bulk-generating hundreds of these files independently.
**Do this instead:** Keep the folder-by-issue physical layout for pipeline traceability, but always populate `author`/`issue` as `reference()` fields into dedicated `authors`/`issues` collections, and `topics` as a controlled/normalized tag list validated by the Zod schema.

### Anti-Pattern 3: Hand-writing the `_redirects` file line by line

**What people do:** Manually type redirect rules as old URLs are discovered during QA, ad hoc.
**Why it's wrong:** With dozens of URL *patterns* (category listings, collection pages) plus potentially hundreds of individual article/issue permalinks, hand-maintenance is error-prone and impossible to keep in sync as new-site slugs get finalized during content ingestion; a missed pattern or a typo'd wildcard silently 404s real inbound links (SEO/backlink loss is exactly what this requirement exists to prevent).
**Do this instead:** Generate `_redirects` programmatically from a data file that's produced by cross-referencing the crawled old-URL inventory against the final `content/` slugs at build/release time (`scripts/redirects/`). Keep static/specific rules ordered before wildcard splat rules, since Cloudflare applies the first match top-down.

### Anti-Pattern 4: Wiring Pagefind before article template HTML structure is stable

**What people do:** Add the Pagefind postbuild step and start tuning search relevance/excerpts early, before the article page layout (headings, semantic sections) has settled.
**Why it's wrong:** Pagefind indexes rendered HTML output, not source content — every layout change (e.g., moving metadata into/out of a `<header>`, changing heading levels) silently changes what gets indexed and how excerpts are generated, causing repeated re-tuning.
**Do this instead:** Treat Pagefind integration as one of the last steps once `ArticleLayout`/`IssueLayout` are finalized against real sample content — it's a cheap, fast step (seconds, per research), so there's no cost to sequencing it last.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| Cloudflare Pages | Git-connected auto build+deploy (push → build → deploy) | Free tier: 500 builds/mo, 20-min build timeout, 20,000 file / 25 MiB per-file deployment limit — sufficient here only because PDFs are excluded from the deployment |
| Cloudflare R2 | Public bucket + custom subdomain (e.g. `files.britishreformed.org`) for PDFs and conference audio | Zero egress fees; bucket is genuinely public once connected to a custom domain — acceptable here since these are already-public archive documents, no access control needed |
| Vellum-VPS | One-directional SSH pull by the ingestion script; not a live/runtime dependency of the site | OCR output format still unknown (flagged in PROJECT.md) — ingestion script design is blocked on inspecting real output |
| YouTube | `<iframe>` embed per conference page, using video IDs stored in `conferences` collection frontmatter | No API key/quota needed for basic embeds |
| Pagefind | CLI run as a `postbuild` step (`pagefind --site dist/`), UI mounted on a static `/search` page | Not an Astro-official integration but a well-established manual pattern; community `astro-pagefind` package exists as an alternative to hand-wiring |
| Cloudflare `_redirects` / Bulk Redirects | `_redirects` file included in build output for the primary map; Bulk Redirects (dashboard/API) only if the map exceeds ~1,900 lines, leaving headroom under the 2,100-line combined limit | Static rules must precede wildcard/dynamic rules in file order; advanced redirects do not chain (A→B→C requires a direct A→C rule) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| Ingestion scripts ↔ `content/` | Filesystem writes (scripts write MDX/YAML files) | One-way; scripts never read back from the live Astro app. Runs as an occasional batch job, not on every build. |
| `content/` ↔ Astro templates | Astro Content Collections API (`getCollection`, `getEntry`, `reference()`) | Schema in `content.config.ts` is the enforced contract; templates should never reach into raw frontmatter without going through the typed collection API |
| Astro build output ↔ Pagefind | Filesystem (Pagefind reads `dist/*.html` after `astro build` completes) | Strict ordering dependency: `postbuild` step, cannot run concurrently with `astro build` |
| Astro templates ↔ R2 | URL reference only (`pdfUrl`/`audioUrl` fields render as `<a href>`/`<audio src>`) | No binding/API call needed for a public bucket + custom domain setup; a Worker binding would only be needed if access control or dynamic behavior (e.g. signed URLs) were required later |
| Redirect layer ↔ everything else | Evaluated by Cloudflare's edge before Pages asset resolution | Fully decoupled from Astro's build; can be developed/tested independently once the final new-site slug scheme is fixed |

## Suggested Build Order (dependency-driven)

1. **Freeze the frontmatter schema and collection structure first** (`content.config.ts` + folder conventions above). Everything downstream — ingestion script output shape, template field access, redirect-map slug source — depends on this being stable. This does *not* require the OCR pipeline to be finished; it requires deciding the shape once, informed by inspecting a few real Vellum-VPS OCR samples.
2. **Hand-author or lightly-script a small sample set** (2-3 issues, ~15-20 articles) conforming to the schema, before the full ingestion pipeline exists. This unblocks template work without waiting on OCR completion — the two workstreams (ingestion pipeline vs. templates) are independent once the schema contract is fixed, and can proceed in parallel.
3. **Build ArticleLayout + IssueLayout templates against the sample set.** Validates the schema in practice (e.g., does it handle multi-author articles? co-authors? missing dates on very old issues?) while the cost of a schema change is still low (20 files, not 413).
4. **Wire R2 asset linking** (PDF download, conference audio) in parallel with step 3 — schema-independent, just a URL field and a link/embed component.
5. **Build cross-cutting Author/Topic index pages** once the schema has proven itself against the sample set — these depend on aggregate queries across the full collection and are the most likely place to discover schema gaps (e.g., topic-tag inconsistency), so sequencing them after the schema has stabilized reduces rework.
6. **Scale content ingestion to all 413 articles / 346 PDFs**, now that templates render correctly and the schema is proven. This is the most mechanical, highest-volume phase and should run without blocking on further template/design changes — it's a data-population phase against an already-working system.
7. **Wire Pagefind search last** (or near-last), once article/issue template HTML structure is final — see Anti-Pattern 4. Fast to add (seconds of build time), no benefit to doing it earlier.
8. **Finalize the redirect map** once the full new-site slug inventory exists (i.e., after step 6) and cross-referenced against the crawled old-URL inventory (a separate, already-noted research/planning input per PROJECT.md). Redirects can be scaffolded early with placeholder/pattern rules for the category-level URLs, but literal per-article mappings can't be finalized until every article has a real, final slug.

**Critical takeaway for roadmap sequencing:** the OCR/ingestion pipeline (external dependency on Vellum-VPS, currently unresolved per PROJECT.md) should **not** gate template/design work. Freezing the schema early and building against a small hand-made sample decouples "content pipeline exists" from "templates can render it" — the roadmap should treat schema-design + template-build as an early phase that only needs a sample of real content, with full-scale ingestion (413 articles) as a distinct, later phase that depends on both the schema (frozen) and the OCR pipeline (external, in progress).

## Sources

- [Content collections - Astro Docs](https://docs.astro.build/en/guides/content-collections/)
- [Content Collections API Reference - Astro Docs](https://docs.astro.build/en/reference/modules/astro-content/) — `reference()` function, relational data pattern
- [roadmap/proposals/0027-content-collections.md](https://github.com/withastro/roadmap/blob/main/proposals/0027-content-collections.md) — why Content Collections exist (perf at scale vs. `Astro.glob`)
- [Cloudflare Pages: Limits](https://developers.cloudflare.com/pages/platform/limits/index.md) — 20,000 file / 25 MiB per-file limits, build timeouts
- [Increased Pages file limit to 100,000 for paid plans — Cloudflare Changelog](https://developers.cloudflare.com/changelog/post/2026-01-23-pages-file-limit-increase/)
- [Redirects · Cloudflare Pages docs](https://developers.cloudflare.com/pages/configuration/redirects/) — `_redirects` syntax, 2,000 static + 100 dynamic limit, ordering rules, no-chaining caveat
- [Maximum redirects, minimum effort: Announcing Bulk Redirects — Cloudflare Blog](https://blog.cloudflare.com/maximum-redirects-minimum-effort-announcing-bulk-redirects/)
- [use r2 as static asset storage for pages — Cloudflare Pages tutorials](https://developers.cloudflare.com/pages/tutorials/use-r2-as-static-asset-storage-for-pages) — official guidance to move large media to R2 when hitting Pages file/size limits
- [Public buckets · Cloudflare R2 Learning Paths](https://developers.cloudflare.com/learning-paths/r2-intro/series/r2-2/) — custom domain + public access pattern
- [Cloudflare Pages Git LFS: File Size Limit? — Cloudflare Community](https://community.cloudflare.com/t/cloudflare-pages-git-lfs-file-size-limit/262356) — LFS inconsistency on Pages
- [GitHub docs: About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) — 50 MiB warning / 100 MiB hard block, repo-size guidance
- [Pagefind](https://pagefind.app/) and [Pagefind GitHub](https://github.com/Pagefind/pagefind) — sharded index architecture, tested to 10,000+ page sites, <300kB total payload
- [Introducing Pagefind: static low-bandwidth search at scale — CloudCannon](https://cloudcannon.com/blog/introducing-pagefind/)
- [Integrate Pagefind's Search with Astro: A Complete Setup Guide](https://syntackle.com/blog/pagefind-search-in-astro-site/) — postbuild pattern
- [astro-pagefind (community integration)](https://github.com/shishkin/astro-pagefind)
- [How We Cut Astro Build Time from 30 Minutes to 5 Minutes](https://medium.com/@mohdkhan.mk99/how-we-cut-astro-build-time-from-30-minutes-to-5-minutes-83-faster-115349727060) — root cause of slow Astro builds is per-page network calls inside components, not raw page count
- [Astro Build Speed Optimization: From 35 to 127 Pages/Second](https://www.bitdoze.com/astro-ssg-build-optimization/) — 339k+ page SSG site built in under 45 minutes, illustrating headroom well above this project's scale

---
*Architecture research for: Static content-archive migration (British Reformed Fellowship / britishreformed.org)*
*Researched: 2026-08-10*
