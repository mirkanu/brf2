# Full-text HTML pipeline for journal articles

## Goal

Replace the per-article `.md` body placeholders (one-line links to PDFs)
with real Markdown prose, including footnotes. Source is the per-article
PDF stored on R2 or accessible via the original Squarespace URL.

The body's schema (`src/content/journal/<slug>.md`) is:

```yaml
---
title: "Article Title"
legacyPath: "/journal/articles/..."
datePublished: "..."
authors: [...]
issueNumber: 77
issueYear: null
tags: [...]
---
<markdown body>
```

## Recipe (verified 2026-09-16, 8-article pilot)

1. **Acquire PDF.** Prefer the per-article PDF (e.g.
   `Issue-77-Gods-Saving-Will-1.pdf`) over the per-issue PDF — it has
   clean text and a single article's footnotes. If only the issue PDF
   is available, page-range trim is required.

2. **OCR extract.** Use `pdftotext -layout` (preserves columns and
   reading order). Avoid `-raw` (loses whitespace) and avoid
   `tesseract` (much slower, only needed if scans are illegible to
   `pdftotext`).

   ```sh
   pdftotext -layout article.pdf /tmp/article.txt
   ```

3. **Page-split** by Form Feed (`\f`). Each chunk represents one PDF page:

   ```sh
   awk -v RS='\f' '{ out = sprintf("/tmp/pages/p%03d.txt", NR);
                     print > out }' /tmp/article.txt
   ```

4. **LLM pass (body markdown, page-aligned chunks of 2-5 pages).**
   Feed pages in batches small enough to fit comfortably below the
   model's output cap. Provide explicit "fix OCR splits, preserve
   verses verbatim, do not renumber footnotes" instructions.

   From the verified pilot, the prompt template is checked in at
   `scratch/fulltext/prompt-body.ts` (the same template that processed
   BRJ77 — Stewart's *God's Saving Will* — with 16/16 footnote
   matches). Two output sections: the Markdown body itself, then a
   `## Footnotes` section listing every `^[N]: text…` definition.

5. **Verify:**
   - every `[N]` body marker has a matching `^[N]:` definition
   - body ends with terminal punctuation (full stop)
   - body size is between ~2k and ~60k chars
   - `npm run build` passes (the schema will reject malformed YAML)

6. **Write** the resulting Markdown to `src/content/journal/<slug>.md`,
   preserving the existing filename convention and frontmatter fields.

7. **Render.** Astro 7 + a Markdown renderer ships with the project and
   converts `[^N]` markers into `<sup>` `<a>` footnote refs targeting a
   `<section data-footnotes>` list at the end. Article popups use the
   existing `FootnoteHover.astro` component — no new build config.

## Known issues from pilot

- **Single-shot LLM calls truncate silently.** The model hits its
  output cap, stops mid-sentence, and returns a "complete-looking"
  markdown file. Symptom: body cuts off in the middle of a verse, or
  footnote definitions list ends at 16 of 36. Always chunk the
  `pdftotext -layout` output page-by-page; for any chunk with >15k
  input chars, split further.

- **Footnote numbering drift.** The model naturally renumbers
  definitions `^1`..^N, breaking the link with the body which still
  uses original numbering. Hard-rule in the prompt: "preserve
  original 1..N numbering; do not renumber definitions."

- **Verse-quotation paraphrase.** KJV-isms get modernised
  ("publick" → "public", "longsuffering" → "patient", etc.) unless
  the prompt forbids it explicitly. Tell the model: "Preserve
  quotations verbatim. Do not modernise spelling or punctuation."

- **Frontmatter YAML fragility.** Strings with colons or apostrophes
  need careful quoting (`"He said: ..."` with double-quote wraps).
  Validate by running `npm run build`.

- **Spanish / Indonesian translations in same corpus.** Some issues
  (e.g. BRJ 51) carry translated reprints. The model will sometimes
  produce an Indonesian or Spanish body instead of the requested
  English version. Name the expected language in the prompt.

- **Footnote markers in nested blockquotes don't render reliably.**
  When a footnote anchor falls inside a `>` line, the rendered HTML
  sometimes emits the marker as plain text. Markdown pipeline still
  works; cosmetic only.

## Rollout plan (post-pilot)

The pilot sampled 8 articles across 4 epochs (pre-2008, 2008-2014,
2015-2020, 2021+). 76 issues remain.

1. Process pre-2008 articles first (issues 1-21; ~80 articles).
   Pre-2008 PDFs are the most uniform, with the cleanest typography.
2. Then 2008-2014 (issues 22-51, ~125 articles) — most articles from
   this era carry heavy footnotes and indented quotations; the
   page-by-page pipeline handles them reliably.
3. Then 2015-2020 (issues 52-69, ~85 articles).
4. Finally 2021+ (issues 70-77, ~135 articles). These are the most
   stylistically diverse; some include Spanish/Indonesian translations.

Estimate: ~10 minutes per article when batched. ~426 articles total
across all four eras.

## Files

- `scratch/fulltext/prompt-body.ts` — the verified LLM prompt
  template.
- `scratch/fulltext/run-pilot.ts` — the pipeline driver.
- `scratch/fulltext/verify.ts` — post-LLM sanity-check.
- `scratch/phase-2/fulltext-html-proposal.md` — the original
  proposal doc (umbrella plan).
