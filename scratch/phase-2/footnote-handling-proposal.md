# Footnotes Proposal — brf2 Journal Articles

**Status:** Proposal
**Date:** 2026-09-04
**Scope:** Inline HTML body for journal articles that contain footnotes (PDF-derived)
**Test article:** `https://brf2.pages.dev/journal/issue/issue-77/category-gods-saving-will-in-the-new-testament-1/`
**Reference PDF:** `https://pub-011dc1a7faab4dbbafd9b3954e64f5f8.r2.dev/pdfs/articles/BRJ77savingwill1.pdf`

---

## 1. Where the user pointed

The article URL `…/category-gods-saving-will-in-the-new-testament-1/` is, today, a placeholder page. Both the live brf2 page and the legacy britishreformed.org page render only a "Read PDF" link — no inline body, no footnotes. To prove the proposal against a real footnote-bearing article, this document uses the same author's `…/category-editorial-more-loving-than-god-3/` (which has extracted H2 headings) and the BRJ77savingwill1.pdf itself (which has 36 footnote markers across 9 page-footnote blocks).

---

## 2. What I found in the source PDF

`pdftotext -layout BRJ77savingwill1.pdf` → 944 lines, 944 lines of body + bottom-of-page footnote blocks. The article has:

- **36 superscript footnote markers** in the running text (`.1`, `.2`, … `.36`, glued to closing punctuation with no space — visually superscript in the PDF, plain-text in the extraction).
- **9 footnote blocks**, one per page that contains references. Each block sits below a thin rule at the bottom of the page. Footnote numbers reset per page (footnote 14 appears at the bottom of page 35 *and* page 36 — the per-page numbering convention means each footnote is page-local).
- Footnote bodies are 2–10 lines, mostly bibliographic citations (Reymond, Zanchius, Schrenk, Calvin, Bucer, Ursinus, Owen) plus a few short authorial asides (footnotes 4, 10, 14).

Footnote text extracted from the PDF (samples):

```
14
   Reymond, A New Systematic Theology, p. 695. See "Quotes on II Peter 3:9"
   for some 18 pages of comments from many theological worthies
   (www.cprc.co.uk/quotes/2peter3v9).

15
   Jerome Zanchius, The Doctrine of Absolute Predestination, trans.
   Augustus M. Toplady (London: Silver Trumpet Publications, repr. 1989),
   p. 23.
```

---

## 3. The inline-HTML conversion you asked for

Converting this PDF to inline HTML with footnotes, by hand, looks like:

```html
<h1 id="gods-saving-will-in-the-new-testament-1">God’s Saving Will in the New Testament (1)</h1>

<p>In this series of editorials…<sup><a id="fnref-14" href="#fn-14">14</a></sup> …</p>

<p>… according to that of the apostle, "having predestinated us, according to
the good pleasure of His will" (Eph. 1.5). … "In this was manifested the
love of God towards us, because that he sent his only-begotten Son into
the world, that we might live through Him" (1 John iv. 9).<sup><a id="fnref-16" href="#fn-16">16</a></sup></p>

<hr class="footnotes-sep" />

<ol class="footnotes">
  <li id="fn-14">
    Reymond, <cite>A New Systematic Theology</cite>, p. 695. See
    <a href="https://www.cprc.co.uk/quotes/2peter3v9">"Quotes on II Peter 3:9"</a>
    for some 18 pages of comments from many theological worthies.
    <a class="fn-back" href="#fnref-14" title="Back to text">↩</a>
  </li>
  <li id="fn-15">
    Jerome Zanchius, <cite>The Doctrine of Absolute Predestination</cite>, trans.
    Augustus M. Toplady (London: Silver Trumpet Publications, repr. 1989), p. 23.
    <a class="fn-back" href="#fnref-15" title="Back to text">↩</a>
  </li>
  <li id="fn-16">
    Zanchius, <cite>The Doctrine of Absolute Predestination</cite>, pp. 23-24. …
    <a class="fn-back" href="#fnref-16" title="Back to text">↩</a>
  </li>
</ol>
```

This is the shape Pandoc, Quarto, Jekyll, and most academic-press CSS files produce. It is accessible, semantic, copyable, and prints well.

---

## 4. Three options, ranked

### Option A — Pandoc `markdown_strict` + footnotes extension (recommended)

**Pipeline:** `pdftotext -layout foo.pdf foo.txt` → author edits / corrects → Pandoc → Markdown body file → Astro renders via `@astrojs/markdown-remark` with the GFM footnotes plugin (already a Remark ecosystem feature; Astro includes `remark-gfm` by default in 4.x+).

- Pandoc's Markdown footnote syntax is exactly the standard:
  ```markdown
  Text[^14] and more.[^15]

  [^14]: Reymond, *A New Systematic Theology*, p. 695.
  [^15]: Zanchius, *The Doctrine of Absolute Predestination*, p. 23.
  ```
- Astro renders `remark-gfm` footnotes natively — `<sup>` markers, `<ol class="footnotes">`, `id="fn-N"` / `id="fnref-N"`, backref arrows. No custom component required.
- Already in the project: `remark-gfm` is part of the Astro 7 default pipeline.
- Trade-off: footnote numbers in the rendered HTML will be **globally sequential**, not the per-page numbering the PDF used. For most readers this is *better* (no jumping back and forth, easier to cite, easier to link). It does change the appearance vs. the printed BRJ. **My recommendation: take this trade — global numbering is what every modern academic site (jstor, marginalia, are.na, substack, footnote.io) uses.** If we ever need to match print pagination we add `[//]: # (page 35)` markers in the markdown.

### Option B — Custom Astro `<Footnote>` component (escape hatch only)

If we ever need finer control — author-defined footnotes, semantic grouping, sidenotes rather than bottom-of-page — we build:

- `src/components/Footnote.astro` — inline marker `<sup><a id="fnref-N" href="#fn-N">N</a></sup>`
- `src/components/Footnotes.astro` — bottom-of-article `<ol>` with backrefs
- A short remark plugin (`remark-brf-footnotes.ts`) that consumes Pandoc-style `[^N]: …` blocks and emits the components.

This is more code but gives us per-article grouping and lets us style footnotes as sidenotes on desktop (Tufte-style) and bottom-of-article on mobile. **Don't build this unless Option A proves limiting.** The default remark-gfm footnote rendering is already correct, accessible, and matches every other academic site on the web.

### Option C — Link footnotes to PDF page anchors (hybrid)

Inline `<sup>` marker links to `https://…r2.dev/pdfs/articles/BRJ77savingwill1.pdf#page=35`, opening the PDF at the exact page where the citation sits. Keeps the body lean (no footnote block in the HTML at all), but:

- Footnote *text* lives only in the PDF.
- Breaks the "everything in the browser, no PDF needed" experience for the user.
- Citation copy-paste from a PDF is painful; HTML footnote text copy-pastes trivially.

**Reject.** The whole Phase 2 effort is to make articles readable in-browser with the PDF as a fallback. A footnote that requires the PDF defeats the goal.

---

## 5. Recommended styling (regardless of A or B)

A small block in `src/styles/global.css`:

```css
/* Footnotes — global remark-gfm styling */
.footnotes {
  @apply mt-12 pt-6 border-t border-rule text-sm text-ink/80 font-sans;
  counter-reset: footnote;
}
.footnotes::before {
  content: "Footnotes";
  @apply block font-serif text-base uppercase tracking-[0.18em] text-muted mb-3;
}
.footnotes li {
  @apply mb-2 pl-4 -indent-4;
}
.footnotes li:target {
  @apply bg-oxblood/5 -mx-2 px-2 rounded-sm;
}
.fn-back {
  @apply text-oxblood no-underline ml-1;
}
.fn-back:hover { @apply underline; }

/* Inline marker */
.prose sup {
  @apply text-oxblood font-sans text-[0.7em] ml-0.5;
}
.prose sup a {
  @apply no-underline;
}
```

`prefers-color-scheme: dark` flips oxblood → paper via the existing `[data-theme="dark"]` selector.

---

## 6. The migration problem (the elephant in the room)

There is **no current body markdown for this article**. The `src/content/articles/gods-saving-will-in-the-new-testament.md` file is frontmatter + summary only — same for `image-of-god-and-responsibility-of-man.md` and `more-loving-than-god.md`. The placeholder article the user pointed to is rendered as `<p><a href="/s/BRJ77savingwill1.pdf">Read PDF</a></p>`.

To actually demonstrate footnotes on brf2, we need to:

1. Run `pdftotext -layout BRJ77savingwill1.pdf > saving-will-1.txt` (already done for this proposal).
2. Hand-edit the text (or run through Pandoc with `--from markdown --to gfm` after manual footnote-anchor placement) into `src/content/articles/gods-saving-will-in-the-new-testament.md` body.
3. Place `[^14]: …` blocks at the bottom.
4. Build, deploy.

**Open question for you:** do we

- (a) Hand-extract each footnote-bearing article, OR
- (b) Run an automated Pandoc pass over `pdftotext` output, accepting that footnote anchors will be guessed (text immediately preceding/following a page-footnote block)?

(a) is correct for 3-5 articles; (b) is necessary once we have hundreds. I'd start with (a) for BRJ77savingwill1 specifically — this is the test article, and footnote quality matters.

---

## 7. What the user actually wants (re-reading the message)

> "we also need to elegantly account for footnotes. To this purpose, first convert https://brf2.pages.dev/journal/issue/issue-77/category-gods-saving-will-in-the-new-testament-1/ to inline HTML (it has footnotes)"

The article as it stands has no body to convert. The footnotes live in the PDF. The minimum useful response is therefore:

1. Demonstrate that the article is currently a placeholder (`<p><a href="…pdf">Read PDF</a></p>`).
2. Show what the inline-HTML conversion *of the PDF* would look like (the snippet in §3 above).
3. Propose the elegant footnote handling (Option A: remark-gfm footnotes — global sequential numbering, `↩` backrefs, oxblood markers, "Footnotes" heading).
4. Confirm with you before extracting the body — this is an editorial act (footnote placement, citation cleanup) and you may want to do it yourself.

**Recommendation:** ship Option A (remark-gfm footnotes) now. It costs ~30 lines of CSS, no new components, and works for every article we extract in future. Defer Option B (custom component) until an article specifically needs sidenote treatment.
