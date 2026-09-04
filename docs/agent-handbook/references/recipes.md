# Recipes

Append-only log of one-off recipes that worked. Newest at the bottom.
If a recipe becomes a regular pattern, promote it into the SKILL.md or
the relevant `references/*.md` file.

## Format

```
### YYYY-MM-DD — short title

Context: what you were trying to do.
Commands / steps: exactly what ran.
Gotchas: anything that bit you.
Files touched: list of files in the repo.
```

### 2026-09-04 — LLM-fix PDF body + footnotes (chunked, no truncation)

Context: Adding a BRJ article body. The BRJ PDFs are scans with
multi-column body and footnotes running into the gutter, so
`pdftotext -layout` produces broken prose, jumbled footnote regions,
and renumbered footnote markers. `pdftotext` alone is not enough —
`pdftotext -raw` is even worse. Pure LLM-from-scratch also fails
because the model invents quotations when it cannot see the original.

Recipe: feed the raw `pdftotext` output to the LLM with an explicit
"fix OCR, do not paraphrase" instruction. Chunk the input by
Form Feed page boundaries, otherwise the LLM silently truncates
the body mid-sentence and drops late footnotes.

Commands / steps:

1. Lay out OCR per page (Form Feed separated):
   ```
   pdftotext -layout /path/to/article.pdf /tmp/article.txt
   pdftotext -raw    /path/to/article.pdf /tmp/article.raw.txt   # cross-ref
   ```

2. Split by Form Feed into per-page files:
   ```
   mkdir -p /tmp/article-pages
   awk -v RS='\f' '{ out = sprintf("/tmp/article-pages/p%03d.txt", NR);
                     print > out }' /tmp/article.txt
   ```

3. LLM pass, body markdown, ^[N] markers, verses verbatim. Send
   pages in batches of 2-3 (so each chunk fits comfortably). Tell
   the model:
   - fix OCR splits (rejoin broken words; do not paraphrase)
   - keep Greek/Hebrew words, italics, small-caps, diacritics
   - number footnote markers in document order, ^[1]..^[36]
   - at end, list every footnote TEXT in a separate block:
     ^[1] author year page.
     ^[2] author year page.
     ...
   Never merge, renumber, or "tidy" footnote references. Use original
   1..N numbering across the whole PDF.

4. Concatenate chunks in order. Verify:
   - last paragraph ends with a full stop
   - every ^[N] in body has a matching definition
   - every definition has a matching body reference

Gotchas:

- Single-shot LLM calls truncate silently. The model hits its
  output cap, stops mid-sentence, and returns a "complete-looking"
  markdown file. Symptom: body cuts off in the middle of a verse,
  or footnote definitions list ends at 16 of 36. Always split into
  page-aligned chunks of ~2-3 PDF pages each.
- Footnote markers renumbering. The model naturally tries to
  renumber definitions [^1]..[^N], breaking the link with the body
  which still uses original numbering. Hard-rule in the prompt:
  "preserve original 1..N numbering; do not renumber definitions."
- Verse references get paraphrased. "For who hath resisted
  his will?" can become "For who can resist His will?" — the LLM
  is over-correcting KJV-isms. Tell it explicitly: "Preserve
  quotations verbatim. Do not modernise spelling or punctuation."
- Headers bleed into body. The title and author line often
  appear twice in the OCR (once on cover, once before body). Strip
  duplicates during the body pass; keep only one frontmatter block.
- Decide before the run: footnote format (^[N] inline marker,
  verses preserved with `vv. N` or `chapter:verse`). Encoding choice
  affects every chunk's prompt.
- Only re-OCR if the existing OCR is so bad the LLM cannot fix
  it. For the BRJ scans, `pdftotext -layout` + an LLM pass is
  enough. Do not pre-emptively re-OCR.

Files touched: src/content/journal/{slug}.json,
src/content/journal/{slug}.md.

### 2026-09-04 — BRJ77 footnote + body extraction (verified 16/16)

Context: First end-to-end run on a real BRJ article — BRJ77savingwill1
(Rev. Angus Stewart, 16 footnotes, 25 PDF pages). Article body lives
on pages 1–12.

Recipe: separate body and footnote-definition extraction into two
LLM passes; chunk body 5 pages at a time; chunk footnote pages by
the pages that actually contain a `N\n  text…` header.

Commands / steps:

1. Page-split:
   ```bash
   pdftotext -layout article.pdf /tmp/article.txt
   awk -v RS='\f' '{ out = sprintf("/tmp/pages/p%03d.txt", NR); print > out }' /tmp/article.txt
   ```

2. Locate footnote pages before calling the LLM. Match
   `(^|\n)\s*<N>\s*\n\s{2,}[A-Za-z"]` per page. For BRJ77, defs were
   on pages 1,3,5,7,14,15,16,17,19,21,23,24,25.

3. Body extraction: chunk 5 pages at a time (~12k chars in, ~10k
   out — well under cap). Hard rules: keep `^[N]` markers verbatim,
   preserve verse spelling ("publick", "longsuffering"), preserve
   Greek italics, drop the duplicate frontmatter H1. For BRJ77: 5
   chunks → 51k chars body, all sections present, ends in full stop.

4. Footnote extraction: pass the precise list of pages that contain
   definitions. For BRJ77: 13 pages in one chunk → 3,283 chars, all
   16 defs complete with original numbering preserved.

5. Stitch body + footnotes; write to
   `src/content/journal/<slug>.md` replacing the `[Read PDF](...)`
   placeholder.

6. Verify: `npm run build`; preview the page; confirm
   `<ol class="footnotes">` contains 16 `<li id="fn-N">` and the
   body has 16 `href="#user-content-fn-N"` links.

Gotchas:

- 5-page chunks are safe for body extraction; tighten only if a
  chunk exceeds ~14k input chars. (Earlier recipe said 2-3 pages;
  that was over-cautious.)
- Do not trust the LLM to find the right footnote pages — pre-detect
  with a regex pass on the OCR text. Saves one wasted LLM call and
  avoids missing footnotes that fall past the article's last page.
- Body pages and footnote-definition pages are disjoint sets. BRJ77's
  body is on pages 1–12, but defs continue on pages 14–25. Run two
  separate passes with different page lists.
- The body pass will accidentally emit some footnote defs (12 of 16
  for BRJ77); discard them and rely on the dedicated footnote pass
  for the complete list.

Files touched: src/content/journal/category-gods-saving-will-in-the-new-testament-1.md.
