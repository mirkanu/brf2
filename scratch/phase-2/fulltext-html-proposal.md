# Plan: Full-Text HTML for all journal articles

**Status:** proposed, not started
**Date:** 2026-09-16
**Owner:** Manuel + Zo
**Scope:** all `section: journal-article` entries in `src/content/journal/` (~426 articles across 77 issues).

## Problem

Of 426 journal-article entries, only a handful have real prose in their `.md` body files (e.g. Stewart's *God's Saving Will*, *More Loving Than God*, *Three Waves*). The rest are one-line placeholders of the form `[Click Here](/s/Issue-XX-Article.pdf)` pointing at the issue PDFs on R2.

Result on the live site: a reader hits an article page and sees just a "Read PDF" link. No HTML body, no headings, no in-page TOC, no Scripture hover, no footnote hover, no reading-time estimate. The hover components (`ScriptureHover`, `FootnoteHover`, `ArticleToc`) are already wired into `[issue]/[slug].astro` and depend on a real rendered body.

## Goal

Every `journal-article` page renders a real HTML body derived from the source PDF, with: headings (h2/h3), paragraphs, scripture references marked up for hover, numbered footnotes, blockquotes, and links preserved.

## Pipeline (high level)

1. **Source PDFs** — already hosted on R2 (`pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev/pdfs/articles/...`) and on the legacy site (`britishreformed.org/s/...`). Each `journalArticles` JSON entry has `pdfLink`; each `journalIssues` entry has `pdfUrl`.
2. **Extract text** — per-article PDF → plain text + page breaks + image bounding boxes. Two routes:
   - **Born-digital PDFs** (most post-2010 issues): `pdftotext -layout` is usually clean.
   - **Scanned older PDFs** (pre-2008, some 2008–2010): OCR via Tesseract / Marker / Docling.
3. **LLM cleanup** — send extracted text to a model with a tight prompt asking for: fix OCR artefacts, restore paragraph breaks, identify h2/h3 headings, mark scripture references, number footnotes, preserve blockquotes and italics cues, output structured Markdown (or HTML) with frontmatter.
4. **Render** — write the cleaned body to the matching `*.md` in `src/content/journal/`. Astro's `render()` already powers the article route.
5. **Verify** — diff against PDF spot-checks; render locally; smoke-test the article page; iterate on a sample of 5–10 before bulk.

## Phases

### Phase A — Spike (validate the pipeline on 5 articles)

Pick 5 articles spanning the three known source shapes:

| # | Article | Why |
| --- | --- | --- |
| 1 | `articles-category-editorial-on-being-reformed` (issue 36, 2003) | short editorial, scanned-era PDF |
| 2 | `articles-category-book-review-grace-and-assurance` | short, mixed prose + headings |
| 3 | `category-gods-saving-will-in-the-new-testament-1` | long, multi-section, has Scripture refs and footnotes — already partially in `stewart-gods-saving-will-1-article-body.json` in scratch |
| 4 | `category-the-three-waves-of-charismatic-christianity` | long, subsection-heavy |
| 5 | `articles-category-book-review-2000-years-of-christs-power` | recent (post-2010), born-digital, lightest test |

Deliverables:
- A `scripts/fulltext/` folder with reusable extraction + LLM cleanup modules.
- A `prompts/fulltext-cleanup.md` prompt file (versioned).
- Sample cleaned `.md` written for each of the 5.
- A side-by-side comparison page or doc with PDF screenshot vs rendered HTML, for review.
- A measured cost/time per article → drives the bulk-phase estimate.

Decisions to make in the spike:
- **Tooling**: pdftotext vs Docling vs Marker. Docling (Python, layout-aware, footnote region detection) is the strongest current option; Marker is a good runner-up. Try both on the scanned sample and pick.
- **Prompt format**: send the model the raw extracted text plus a structured output schema (headings list, body markdown, footnotes list, scripture refs list). Use `output_format` for structured extraction where it helps.
- **Footnote handling**: source PDFs number footnotes per page or per article. The existing `FootnoteHover` component reads `<sup>`-numbered anchors with `data-footnote` attrs. Decision: do we (a) inline footnote text at the bottom of the article, (b) keep footnotes as a numbered list at end-of-article with hover tooltips, or (c) store footnote text separately and wire a real hover source? Recommended: (b) for v1, matching the current component shape.
- **Scripture refs**: regex-pass before sending to the LLM, then have the LLM confirm. The `ScriptureHover` component already keys off `[data-scripture]` spans, so the LLM just needs to emit `<span data-scripture="John 3:16">John 3:16</span>`.

### Phase B — Bulk migration (with human review gates)

After the spike is approved:

1. Build a manifest: for every `journal-article` JSON, record `id`, `pdfLink`, `pdfSource` (r2 vs legacy), `bodySize` of current `.md` (skips/flags anything >200 chars), `estimatedTokens`.
2. Chunk into batches of ~20 articles. Process each batch: extract → LLM → write `.md` → run `bun run astro check` on the file → preview the page → push to a preview branch (per workspace rule on Cloudflare Pages).
3. Human review checkpoint every batch: render the article page locally, spot-check 2 random articles per batch against the PDF, flag any with low confidence or unusual markup.
4. After ~50 articles, retro-check the prompt for systematic errors (common OCR misreads, missing footnote numbering, etc.). Update `prompts/fulltext-cleanup.md`, re-run flagged articles.
5. Continue to 426.

### Phase C — Quality polish (post-bulk)

- Add `ArticleToc` data: the route already builds TOC from `headings` — confirm h2/h3 detection is consistent.
- Verify Scripture hover finds references across all articles; add a corpus pass for missed patterns.
- Footnote numbering cross-check: per-article continuous numbering, no collisions.
- Add reading-time and word-count to JSON-LD if it isn't already.
- Update `STATUS.md` and `agent-handbook` with the new pipeline as the canonical approach for adding journal articles.

## Cost & time estimate (rough, pending spike)

- Extraction: ~5–15 s/article on a Hetzner-class box, free.
- LLM cleanup: dominant cost. A 6,000-word article ≈ 10–15k tokens in/out. At ~$3/1M in, ~$15/1M out (Sonnet-class), that's ~$0.10–0.20 per article. 426 articles → **$40–90** total LLM spend, plus retries.
- Wall time: 426 × 30 s ≈ 3.5 hours single-threaded, or ~1 hour with 4-way parallelism. Human review is the bottleneck, not compute.

## Risks

1. **OCR quality on 1990s/2000s scans** — some issues were photocopied and may have ligature issues, dropped diacritics, etc. Mitigation: spike first, measure, decide if a second LLM pass or human transcription is needed.
2. **Footnote/ scripture ref ambiguity** — the LLM may mis-number footnotes or miss references. Mitigation: regex pre-pass + structured output + human spot-check.
3. **Cost overrun** — if any single article explodes in token count (some are 20k+ words), cap with a hard character limit and split into parts. Decide per-article.
4. **Schema drift** — the cleaned `.md` files need to round-trip through Astro's content collections with no schema errors. Mitigation: run `astro check` on every file before commit.
5. **Editorial variance** — BRF articles have varied typography: some use em-dashes, some use en-dashes, some hyphenate line-broken words. Decide once and bake into the prompt.

## Open questions for Manuel

1. Budget for the LLM pass: is ~$50–100 acceptable, or should we pick a cheaper model (Haiku-class) for first pass + Sonnet for review?
2. Are we OK rewriting the existing Stewart article bodies (the few `.md` files that already have content) to match the new pipeline's output format? Or preserve them as-is?
3. Footnote model: in-article bottom-of-page notes vs. numbered hover tooltips vs. both? Current component supports hover; v1 plan is bottom-of-article numbered list.
4. Do we publish a "machine-converted" disclaimer on first deploy, then remove it after a final editorial sweep?

## Files / places to touch

- New: `scripts/fulltext/` (extraction + LLM driver)
- New: `prompts/fulltext-cleanup.md`
- New: `scratch/phase-2/fulltext-pipeline-status.md` (running log)
- Modified: 426 `.md` files in `src/content/journal/` (one per article body)
- Modified: `STATUS.md`, `agent-handbook/` (new canonical workflow entry)
- Optional: `src/components/FootnoteHover.astro` — confirm it handles bottom-of-article list rendering, or add a small variant.

## Out of scope

- Migrating the *editor's blog* (`category-editor-*` prefix) or the *upcoming issue announcements* (`category-upcoming-*`) — those aren't journal articles and currently link directly to PDF. Leave alone for v1.
- Conference speeches / podcasts — separate content collections, separate concern.
- Re-typesetting the print edition or fixing original PDF typos — we're faithfully reproducing, not editing.
