# Article reading experience — Phase 2 feature proposal

**Target page:** `/journal/issue/issue-NN/[slug]/` — long-form theological articles, 700+ pages, often 3000–8000 words.

**Goal:** make reading a single article feel closer to reading on a polished publication (Medium, Substack, *The Atlantic*) without ever competing with the BRF editorial brand (oxblood / paper / serif).

## Constraints (binding)

- No external runtime dependencies (Astro static; we don't ship jQuery).
- Honour `prefers-reduced-motion`: progress bar still updates, but no smooth-scroll, no animation.
- All keyboard-accessible; works on mobile and desktop.
- Honours the brand palette already in `prose-brand` and `oxblood`.
- Sits inside the existing article wrapper — does not bleed into the rest of the site.
- Uses IntersectionObserver (the standard 2026 pattern); no scroll-event throttling hacks.

## Corrections to the previous version

- The pilot article **does** have headings. Confirmed against the live build:
  - *Editorial: More Loving Than God? (3)* → 2 H2s (`#how-to-measure-gods-love`, `#according-to-his-being`).
  - Long-form articles in the journal will typically have several. The TOC will render — not collapse.
- TOC visibility rule, revised: render when `≥ 2` headings (a 2-link TOC is borderline useful but still a real map); hide when `0` or `1` heading.
- Recommended pilot for the TOC: `issue-77/category-editorial-more-loving-than-god-3` (short, two H2s, validates the build) **plus** one of issues 26 / 31 / 32 / 78 once the corresponding Markdown bodies arrive, so we can validate the multi-section highlight behaviour.

## Proposed features, ranked

### 1. Reading progress bar (P0 — ship first)

**What:** a 2 px oxblood line fixed to the very top of the viewport that fills left-to-right as the reader moves through `<article class="prose prose-brand">`. The fill = `(scrollY − articleTop) / (articleHeight − viewportHeight)`, clamped to `[0, 1]`. Progress is measured against the article element specifically — not the whole page — so the header / breadcrumb / footer don't lie about "being read."

**Why this one first:**
- Industry-standard pattern; reader expectation from NYT, Medium, Substack, every long-form publication since ~2018.
- Cheap to build (~30 lines of JS, one rAF loop).
- Doesn't depend on the other features.
- Solves a real problem on the actual BRF articles (long, dense, theological).

**Implementation:**
- One `<ProgressBar />` Astro component, mounted on the article page only.
- Single `IntersectionObserver` + `requestAnimationFrame` loop on the article element.
- Uses `transform: scaleX(progress)` (GPU-friendly, no layout thrash).
- Accessible: `role="progressbar"` with `aria-valuemin/max/now`, hidden from AT by default (it's purely a visual signal — `aria-hidden="true"` is correct).
- Reduced-motion: same behaviour; the line itself doesn't animate, it just appears at the new width each frame (which is fine).

**Where it lives:** the very top of the viewport, **above the sticky header**. A 2 px strip at `position: fixed; top: 0; left: 0; right: 0; z-index: 50` — outside the header element so it doesn't shift when the header restyles.

### 2. Back-to-top button (P0 — ship with progress bar)

**What:** a small circular button, bottom-right of the viewport, appears once the reader has scrolled >400 px, smoothly scrolls back to top on click. Hidden by default so it doesn't cover the bottom of the article or the footer.

**Why:**
- On long articles the user can be 6000 words deep; Home-key works for keyboard users but mouse / touch users need this.
- Industry standard; users expect it.
- Accessibility: must be `tabindex="0"`, have `aria-label="Back to top"`, and move focus to the article `<h1>` after scrolling — not just move the viewport. Scroll-to-top buttons that leave focus stranded are the most common a11y mistake.

**Implementation:**
- `<BackToTop />` Astro component, vanilla JS.
- Threshold: show after `scrollY > 400`, hide when `< 200` (hysteresis to avoid flicker).
- Click → `window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })`, then `document.querySelector('article h1')?.focus({ preventScroll: true })`.
- Sits at `position: fixed; right: 1.25rem; bottom: 1.25rem;` — 40 × 40 px, oxblood outline on hover.
- Conflict avoidance: hidden when the footer is in viewport (IntersectionObserver on the footer).

### 3. Floating time-remaining chip (P0 — ships with progress bar)

**What:** a small chip near the bottom-right of the screen (just above the back-to-top button) that reads "4 min left" or "Done ✓" as the reader scrolls.

**Why:**
- Builds directly on the progress bar (same rAF loop, ~10 extra lines).
- Concrete payoff signal — readers close the tab at 90 % if they think they have 5 min left; honest feedback matters.
- Used by Medium, Substack Notes preview, every paywall-backed publication.

**Implementation:**
- Same `<ProgressBar />` component (logical pair); DOM-adjacent to the back-to-top button.
- `timeLeft = ceil((1 − progress) × readingTime)`.
- Aria: `aria-live="polite"` but throttled to ≥10 s between updates so screen readers don't chatter.

### 4. Sticky in-article table of contents (P1)

**What:** a small right-rail TOC (*On this page*) that lists the article's `<h2>` and `<h3>` headings, sticks to the top of the viewport as the reader scrolls, and highlights the currently-visible section.

**Why:**
- Useful for the long articles (the 80-page journals have 8000-word pieces with 6+ subheadings).
- Lets a reader who got linked into the middle jump to the next section without scrolling.
- Becomes a free deep-linking surface: `#according-to-his-being` is shareable.

**Edge case:** render only when `≥ 2` H2/H3 headings exist. Otherwise omit entirely (no empty box).

**Implementation:**
- Build the TOC at SSG time in the `[slug].astro` page itself: walk the rendered MD content, extract `h2`/`h3` with `id` slugs, render an `<aside>` with anchor links.
- Auto-generate `id`s on headings via `rehype-slug` (Astro supports rehype plugins in `astro.config.mjs`).
- Client-side: IntersectionObserver with `rootMargin: "-80px 0px -70% 0px"` highlights the link whose section is currently in the top portion of the viewport. This is the exact pattern CSS-Tricks documents.
- Sticky positioning: `position: sticky; top: 5rem;` (just below the header on desktop).
- **Mobile:** a collapsible `<details>` block at the top of the article, "On this page (5 sections)" with the same anchor list inside. Inert until tapped. This is the current best practice (Smashing Magazine, css-tricks, 2026 mobile reading research) — mobile readers get a tap-to-expand rather than losing screen real estate to a sticky sidebar that doesn't work on small screens.

### 5. Estimated reading time + word count (P1)

**What:** in the article header, display "12 min read · 2,400 words" alongside the existing author/date line.

**Why:**
- Cheap (one line of build-time computation, one template line).
- Gives the reader a concrete reason to commit to the article.
- Matches every Substack / Medium / NYT article header.

**Implementation:**
- Compute at build time in `[slug].astro`: `Math.max(1, Math.round(wordCount / 225))` (225 wpm = average adult reading speed; conservative end — theological content skews slower).
- Derive `wordCount` from the rendered Markdown at build time. No backfill needed — works from the moment a body file is added.

### 6. Section deep-linking on share (P1 — already mostly free)

When the TOC ships, the URLs `…/article/#section-name` will Just Work for sharing a specific section. No work needed beyond making sure the rehype-slug plugin generates stable IDs. Worth calling out as a deliverable.

### 7. Print-friendly article (P1 — almost free, but ships value)

**What:** `@media print` rules that strip the header, footer, progress bar, back-to-top, time chip, TOC; reflow the article to a single column with the title + author + URL at the top; preserve the prose styling. Result: a clean PDF when the user does Cmd-P → Save as PDF.

**Why:**
- A surprising share of long-form readers (esp. theological / academic) print to read offline, annotate, or archive. BRF's audience skews this way.
- Costs almost nothing to ship — one CSS block in `src/styles/print.css`, included via `Site.astro`.
- Cuts the user's dependence on the "Read PDF" button (which is currently disabled while R2 is unwired).

### 8. Smooth scroll with offset for sticky header (P2)

**What:** when the reader clicks a TOC link or a deep-link, the page scrolls to the heading **minus 80 px** so the heading isn't hidden under the sticky header.

**Why:**
- Free correctness fix once deep-linking exists.
- Prevents the "where is the heading I jumped to?" confusion.

**Implementation:**
- Either CSS `scroll-margin-top: 5rem` on every `<h2>` / `<h3>` inside the article (one rule, zero JS) — preferred.
- Or JS `scrollTo({ top: heading.offsetTop − 80 })` in the TOC click handler. CSS is cleaner.

### 9. Quiet reading mode toggle (P2 — deferred unless asked)

A tiny "Focus" pill in the article header that dims everything outside `<article>` (header, footer, sidebars) and widens the prose column. Think Pocket / Readability. Useful for theology, but a different category of feature — flagged for future consideration, not in this round.

## What I am NOT proposing (and why)

- **Floating action buttons** for share / like / save — these are "bad FAB" patterns per the a11y research, and BRF is not social-media-first content. If sharing becomes a goal, put share buttons inline at the end of the article.
- **Save-for-later / bookmark / account features** — scope creep; not in Phase 2.
- **Reading-history tracking / cookies** — GDPR minefield, no payoff for a non-profit journal.
- **Scroll-triggered animations** (fade-ins, parallax) — actively *hurts* accessibility and contradicts the editorial feel.
- **Text-to-speech button** — useful in theory but web speech API quality is uneven across browsers; defer to the OS / browser's built-in read-aloud.
- **Highlight-and-share quote cards** (à la Substack / Medium) — fun but out of scope; revisit post-Phase 3.

## Recommended ship order

1. **Progress bar + back-to-top + time-remaining chip** together (one PR, low risk, ~1 day).
2. **Word count + reading time** in the article header (~2 hours).
3. **`rehype-slug` plumbing + print stylesheet + scroll-margin offset** in one PR (~half a day).
4. **Desktop sticky TOC + mobile `<details>` TOC** (~1 day).
5. Polish: keyboard nav between sections, focus management on TOC click.

Each ships behind component isolation so we can revert any one without rolling back the others.

## What I need from you before building

1. ~~Progress bar placement~~ — **resolved:** top of viewport, above the sticky header.
2. ~~TOC on mobile~~ — **resolved:** collapsible `<details>` at the top of the article (industry best practice).
3. **Pilot article for the TOC:** is `issue-77/category-editorial-more-loving-than-god-3` (short, 2 H2s) enough for the first ship, or do you want me to wait for a heading-rich article from issues 26 / 31 / 32 / 78 to validate the highlight behaviour against more sections?
4. **Print stylesheet:** ship in this round, or defer?
5. **Quiet reading mode:** in or out of Phase 2?
