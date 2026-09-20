---
name: fulltext
description: Extract full-text Markdown bodies for British Reformed Journal articles from PDFs, normalise OCR, run the LLM pass to add headings and footnotes, and validate every article against the full-text checklist. Use when adding, fixing, or auditing the body of any article in src/content/journal/, when running the full-text pipeline over a new issue, or when checking that an article passes the seven checks (headings, footnote parity, no truncation, scripture ranges, author names, JSON-LD, typography). Scripts live alongside this SKILL.md and are runnable from the repo root.
---

# fulltext

Turn journal article PDFs into Markdown bodies that pass the seven
full-text checks. The pipeline has five stages and the validator
(`validate.py`) is what proves an article is shippable.

## When to use

- A `src/content/journal/<slug>.md` has a one-line placeholder body and
  the underlying PDF exists (R2 or otherwise).
- You need to verify whether an existing substantive body passes the
  checklist.
- You are processing a new journal issue end-to-end.
- A new failure mode appears in `validate.py` output and you need to
  reproduce/fix it.

## Pipeline stages

1. **Extract.** `pdftotext -layout` for born-digital PDFs; Tesseract
   fallback for scanned. One page per file in
   `scratch/fulltext/raw/<issue>/<slug>/pNNN.txt`.
2. **Normalise.** Strip headers/footers, de-hyphenate line breaks,
   collapse whitespace, surface footnote definitions. Script:
   `scripts/normalize.py`.
3. **LLM pass.** Rebuild Markdown from the page-aligned chunks. Add
   headings, restore footnote markers + definitions, normalise
   scripture ranges, fix author names. Driver:
   `scripts/run-pilot.ts`.
4. **Validate.** `validate.py src/content/journal/<slug>.md` —
   mechanical check against the seven-rule checklist below.
5. **Render check.** Spot-check `brf2.pages.dev/journal/issue/issue-NN/<slug>/`
   on the Cloudflare Pages preview.

## Seven-rule checklist

A full-text article is shippable when `validate.py --strict` exits 0.
Each rule has a validator check and a default severity:

| # | Rule | Default severity |
| --- | --- | --- |
| 1 | Headings present (`h2`/`h3` derived from layout) | warning |
| 2 | Footnote markers ↔ definitions parity (no orphans either side) | **error** |
| 3 | No mid-sentence truncation, body ends with terminal punctuation | **error** |
| 4 | Scripture refs in canonical ranges (e.g. `Rom. 8:28–39`) | warning |
| 5 | Author names canonical (no "Dr." / stray initials) | warning |
| 6 | JSON-LD host page renders without warnings | warning |
| 7 | Reading-time spacing / typography intact | warning |

Errors block; warnings are surfaced but allowed through. Override with
`--strict` (warnings also block) or `--lenient` (errors become warnings).

## Quick start

```sh
# Validate one article
python3 docs/agent-handbook/skills/fulltext/scripts/validate.py \
    src/content/journal/<slug>.md

# Validate every journal article in the collection
python3 docs/agent-handbook/skills/fulltext/scripts/validate.py \
    src/content/journal/*.md --summary

# Re-run the LLM pass on a single article (assumes raw text already extracted)
npx tsx docs/agent-handbook/skills/fulltext/scripts/run-pilot.ts --slug <slug>
```

## Files

- `scripts/validate.py` — the seven-rule checklist.
- `scripts/normalize.py` — header/footer strip, de-hyphenation,
  whitespace collapse, footnote surfacing.
- `scripts/run-pilot.ts` — page-aligned chunker + LLM driver. Promotes
  the prototype in `scratch/fulltext/{chunked,run-pilot}.ts`.
- `references/recipe.md` — the verified 8-article pilot recipe.
- `references/open-issues.md` — known failure modes and mitigations.

## Out of scope

- R2 PDF hosting wiring.
- Search/grep over full-text bodies.
- PDF reader overlay / annotation.
- Slug or section-schema changes.
