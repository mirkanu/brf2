# Footnotes

PDF articles in the BRJ corpus contain footnotes — both author
footnotes and scriptural cross-references. When extracting to
Markdown for the website, the right target is **inline HTML** so the
reference stays inside the flow of reading.

## Why inline, not Markdown footnotes

`remark-gfm` supports `[^1]` Markdown footnotes, but:

1. Markdown footnotes render as a `<sup>`-style superscript with a
   section at the end of the article. That's fine for academic
   papers but reads awkwardly inside an editorial where the
   footnote text is often a clarification rather than a citation.
2. The corpus mixes scriptural cross-references (e.g. "(Rom. 9:18)")
   with actual footnotes. Cross-references should stay inline as
   plain text; only true footnotes get the treatment.
3. Some PDFs have multi-paragraph footnotes. Markdown footnotes
   don't render well past one paragraph in our Tailwind setup.

So the rule is: **convert true footnotes to inline HTML with a
small, styled footnote marker; leave cross-references as inline
text.**

## Inline-HTML format

Each footnote becomes two pieces:

1. A **marker** in the prose where the original footnote anchor was:

   ```html
   <sup class="fn-mark" id="fnref-1"><a href="#fn-1">1</a></sup>
   ```

2. A **target** at the end of the paragraph (or section) the
   footnote belongs to:

   ```html
   <span class="fn-target" id="fn-1">
     Paul’s argument here assumes the prior discussion in Romans 8.
   </span>
   ```

The pair is bound by matching `id`/`href`. CSS in
`src/styles/global.css` (or a per-article scope) styles
`.fn-mark` as a small superscript with a hover underline, and
`.fn-target` as a slightly indented, muted block at the end of the
paragraph (or floated to the margin on wide screens).

## Numbering

Number footnotes sequentially per article. Re-use numbers when a
footnote is cited twice in the same article — the second cite points
back to the original `id`.

## When to apply

- Article body comes from a PDF: apply.
- Article body is written fresh in Markdown: write inline
  parentheticals or pull-quotes, not footnote-style markers.

## Conversion recipe (one-off)

For each PDF:

1. `pdftotext -layout article.pdf /tmp/article.txt`
2. Identify footnote anchors in the source text (small superscript
   numerals, often clustered at paragraph ends).
3. Identify footnote bodies at the bottom of each page or end of
   the article.
4. Renumber footnotes sequentially through the article body.
5. Place each `<span class="fn-target">…</span>` immediately after
   the paragraph that contains its marker (preferred for editorial
   readability) OR at the end of the article (only when the source
   layout puts all footnotes at the end).
6. Hand-fix OCR artefacts around footnote numbers — pdftotext
   occasionally drops a digit or splits it across the line break.

## Worked example

Original PDF text (paragraph):

> We have seen how modern proponents of the "well-meant offer" on
> occasion have made essentially the same blasphemous and
> hypocritical argument.¹

Converted body:

```markdown
We have seen how modern proponents of the "well-meant offer" on
occasion have made essentially the same blasphemous and hypocritical
argument.<sup class="fn-mark" id="fnref-1"><a href="#fn-1">1</a></sup>

<span class="fn-target" id="fn-1">
  Compare the discussion in Jesse Morell, "The Problem of
  Calvinism," 2019.
</span>
```
