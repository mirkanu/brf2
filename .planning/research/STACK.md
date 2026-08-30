# Stack Research

**Domain:** Static content-archive site (400+ long-form articles + PDFs), Squarespace migration, fully automated authoring via Claude Code file writes/git
**Researched:** 2026-08-10
**Confidence:** HIGH (core framework/hosting choices verified via npm registry + official docs); MEDIUM (redirect-volume estimate, PDF-storage tradeoff — depend on data not yet extracted)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Astro** | 7.2.0 | Static site generator / framework | Content-first, ships zero client JS by default, has a first-class typed content layer (Zod-validated frontmatter) purpose-built for exactly this workload: hundreds of Markdown/MDX files with structured metadata (issue, author, topic). As of Jan 16, 2026, Cloudflare acquired The Astro Technology Company outright — the framework remains MIT/open-source, but Astro and Cloudflare's edge/Pages team are now the same org, which is a strong signal for long-term Cloudflare Pages compatibility. Requires Node ≥22.12.0. |
| **@astrojs/mdx** | 7.0.5 | MDX support in content collections | Lets OCR'd article bodies be plain Markdown while still allowing occasional embedded components (e.g. a "Download PDF" button, a pull-quote block) without leaving the content file. Matches the "Markdown/MDX files in git" requirement verbatim. |
| **Pagefind** | 1.5.2 (core) + **astro-pagefind** 2.0.1 | Client-side full-text search | Rust/WASM search that indexes the *built HTML* after `astro build` — no server, no API key, no per-query billing, no database. Indexes of even 10,000-page sites stay under ~300KB total; at 400+ articles the BRF index will be trivially small and near-instant. Runs entirely in-browser (privacy-friendly, matches a religious-nonprofit's no-tracking posture). Recent versions (post-1.5) run search in a Web Worker automatically, keeping the main thread responsive. |
| **Cloudflare Pages** | — (platform, no version) | Static hosting + deploy | Already the account used for DNS/tunnels on this VPS (per global CLAUDE.md convention — one API key, one account). Git-push CI/CD with per-branch preview URLs. For a *pure* static Astro build (`output: 'static'`, the default), **no Cloudflare adapter is needed** — Pages just serves the `dist/` folder directly. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@astrojs/react` | 6.0.2 | React islands | Only where real interactivity is needed — e.g. a richer search/filter UI beyond Pagefind's default widget, or an issue/author/topic faceted browser. Do not reach for it on pages that are pure text + links; Astro's islands architecture means unused React never ships to the client. |
| `@astrojs/sitemap` | 3.7.3 | Auto-generated `sitemap.xml` | Always — 400+ pages migrating off an indexed Squarespace site means preserving/rebuilding search-engine crawl coverage matters. Zero-config: add to `integrations[]`, point `site:` at `https://britishreformed.org`. |
| Astro **Content Layer API** (built-in, no separate package) | ships with Astro 7 | Typed content collections via `glob()` loader + Zod schema | The core authoring mechanism. Define one schema for BRJ articles (title, author, issue, topic tags, pubDate, pdfPath, sourceSquarespaceUrl) so a malformed frontmatter file written by Claude Code fails `astro build`/`astro check` loudly instead of silently shipping broken metadata. This is the single most important guardrail for an unattended, file-write-only authoring model. |
| Astro **Fonts API** (built-in, stable since Astro 6) | ships with Astro 7 | Self-hosted web fonts, zero layout shift | Native support for Google/Fontsource/Bunny/local fonts with automatic fallback-metric generation — the Astro-native equivalent of `next/font`. Use this instead of a manual `@fontsource-*` install; it's now first-party. |
| Astro **View Transitions** (`astro:transitions`, built-in) | ships with Astro 7 | Smooth cross-page navigation | Gives the "lightning fast" feel (no white-flash page loads) with near-zero JS cost — directly serves the "beautiful, modern, fast" design requirement without adopting a client-side router. |
| **Tailwind CSS** | 4.3.3 (`@tailwindcss/vite`) | Styling | Tailwind v4's CSS-first config (no `tailwind.config.js` needed) integrates via a single Vite plugin line in `astro.config.mjs`. Matches the global VPS convention of Tailwind-first styling even though the Next.js-specific shadcn/ui toolchain doesn't apply here (see "What NOT to Use"). |
| `lucide-astro` | 0.556.0 | Icons | Astro-native port of the lucide icon set used elsewhere in the org's projects (per global convention) — tree-shakeable, renders as inline SVG with zero JS. |
| `astro-og-canvas` | 0.13.0 | Dynamic OG/social share images | Astro-native equivalent of `next/og` — generates a per-article social card at build time (useful for 400+ articles being shared individually, e.g. via the BRF podcast/socials). |
| `motion` | 13.0.0 | Animation (only inside React islands) | Framework-agnostic fork of Framer Motion works standalone; use sparingly and only within an island component (e.g. an animated search results list). Prefer CSS transitions + View Transitions for anything that doesn't need JS-driven physics. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `astro check` | Type/schema validation | Run in CI (or by Claude Code before each commit) to catch content-collection schema violations — critical since no human reviews frontmatter by eye. |
| Wrangler CLI (`wrangler` ^4.83.0) | Optional manual Cloudflare deploys / local `_redirects` testing | Not required for the primary workflow (Git-integrated Cloudflare Pages builds on push), but useful for testing `_redirects` behavior locally or scripting a Bulk Redirects upload via API. |
| pnpm (or npm) | Package manager | Astro's own tooling is validated against pnpm ≥7.1.0 and npm ≥9.6.5; either works — pick whichever the rest of the VPS's projects standardize on. |

## Installation

```bash
# Scaffold
npm create astro@latest -- --template minimal

# Core
npm install astro@^7.2.0 @astrojs/mdx@^7.0.5 @astrojs/sitemap@^3.7.3 @astrojs/react@^6.0.2 react@^19 react-dom@^19

# Search (Pagefind runs as a post-build step, not a runtime dependency)
npm install -D pagefind astro-pagefind

# Styling / UI
npm install tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3 lucide-astro astro-og-canvas motion

# Type checking
npm install -D @astrojs/check typescript
```

`astro.config.mjs` essentials:
```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';

export default defineConfig({
  site: 'https://britishreformed.org',
  output: 'static', // default — explicit for clarity, no adapter needed
  integrations: [mdx(), sitemap(), react(), pagefind()], // pagefind last: runs after build output exists
  vite: { plugins: [tailwindcss()] },
});
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Astro (content collections + MDX) | **Next.js `output: 'export'`** | Only if the project needed React Server Components, ISR, or an eventual move to a dynamic backend. For this project it's actively worse: static export disables `next/image`'s optimizer (needs a custom loader), disables ISR entirely, requires `generateStaticParams()` to pre-enumerate every one of 400+ article routes by hand, and Next's whole architecture (App Router, SSR-first) is designed around having a server — which this project explicitly does not want. Next.js is the wrong tool when the target is "zero server, zero database, forever." |
| Astro | **Eleventy (11ty)** | A legitimate choice for <5,000-page archives with no interactivity — simpler mental model, faster cold-start dev server, no build framework to learn. Would be the pick if this were a pure static-HTML brochure site. Astro wins here because: (a) Zod-validated content collections give build-time safety for an unattended, Claude-Code-only authoring pipeline (11ty's frontmatter is untyped by default), (b) Astro islands give a clean path to the richer issue/author/topic browsing UI the requirements call for without adopting a full SPA framework, (c) the Jan 2026 Cloudflare/Astro merger strengthens the Astro+Cloudflare Pages pairing specifically. |
| Astro | **Hugo** | Best choice if the archive were 10,000+ pages and raw build-speed-at-scale were the dominant constraint. At 400+ articles this is far below Hugo's advantage threshold, and Hugo's Go-template authoring model is a worse fit for "Claude Code writes files" — Go templates lack MDX/JSX ergonomics for embedding components, and Hugo has no equivalent to typed Zod content schemas for catching malformed metadata at build time. |
| Cloudflare Pages | **Cloudflare Workers + Static Assets** | This is genuinely Cloudflare's own 2026 recommendation for *new* projects generally (Workers achieved static-asset feature parity with Pages in March 2026, and Cloudflare is steering new development toward Workers). For a pure content-first site with no backend logic, per-branch preview deploys, and dead-simple git-push CI/CD, Pages remains the better fit and is still fully supported with no forced-migration deadline. Revisit only if the project later needs Workers-only primitives (Durable Objects, Workflows) — unlikely for a static archive. |
| Pagefind | **Algolia (DocSearch or paid)** | Only if the org needed typo-tolerant fuzzy ranking at a scale where in-browser indexing becomes impractical, or a hosted dashboard for non-technical query tuning. For 400+ articles this is enterprise-grade overkill: Algolia bills per search/index size beyond free tiers, requires a third-party API key to manage/rotate (conflicts with the "zero ongoing maintenance" goal), and sends every user query to a third party — undesirable for a religious nonprofit with no marketing budget. |
| Pagefind | **Cloudflare-native search (Vectorize / AutoRAG / D1 full-text)** | Only if the project wanted semantic/AI-assisted search. All of these require standing up an embeddings pipeline, a vector or SQL database, and ongoing query cost — directly violating the "no database, no server, zero maintenance" constraint that is the entire reason this migration is happening. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Next.js in any mode (SSR, hybrid, or `output: 'export'`) | Architecturally built around having a server; static export mode is a secondary, workaround path with real gaps (image optimization, ISR, dynamic route enumeration) rather than a first-class target the way it is in Astro. | Astro with `output: 'static'` |
| Any headless CMS (Sanity, Contentful, Payload, Strapi, etc.) | Reintroduces exactly the "database + API + auth to maintain" problem this migration exists to eliminate. Content must live as files in git per the project's explicit constraint. | Astro content collections reading MDX files directly from the repo |
| Algolia or any hosted/paid search backend | Recurring cost, third-party API key to rotate, query data leaves the site — none of which is needed for a 400-article static archive. | Pagefind (build-time indexed, zero-backend, zero-cost) |
| shadcn/ui as literally specified in the global Next.js styling convention | shadcn/ui's CLI and component internals (and `next-themes` specifically) assume a Next.js/React app shell; porting it wholesale into an Astro islands site adds unnecessary React runtime weight to pages that should ship zero JS. | Tailwind CSS v4 directly for markup/styling, with hand-rolled or lightly-adapted component patterns; reserve React (and shadcn-style components within it) only for the interactive islands (e.g. search UI) |
| Storing all 400+ OCR'd PDFs directly in the git repo's `public/` folder without a size check | Cloudflare Pages caps individual files at 25 MiB, and — separately from that hard limit — a git repo carrying hundreds of MB-to-GB of binary PDFs bloats clone/build times on every Pages deploy indefinitely (git doesn't shrink binary history without a rewrite). | See "PDF Handling" below: route PDFs through Cloudflare R2 (already planned for conference audio) instead of the git repo, or use Git LFS if they must stay repo-adjacent |
| Matching legacy query-string URLs (e.g. `/journal/articles?category=Issue+77`) with the `_redirects` file | Cloudflare Pages' `_redirects` file explicitly does **not** support query-parameter matching (confirmed in official docs) — a redirect rule keyed on `?category=` will not fire. | A Cloudflare Bulk Redirects rule (supports more complex matching) or a small Cloudflare Pages Function / Worker that reads `URL.searchParams` and issues the 301 in code |

## Stack Patterns by Variant

**If the OCR'd PDFs turn out to be large (scanned-image PDFs commonly run 5–20MB+ each) or the total archive exceeds a few hundred MB:**
- Do not put them in `public/` (which Astro copies verbatim into every git-tracked deploy). Upload them to Cloudflare R2 (the same bucket/account already planned for conference audio) and reference each article's PDF via a stable R2/CDN URL stored in that article's frontmatter (`pdfUrl: "https://cdn.britishreformed.org/brj/issue-77/article-slug.pdf"`).
- This keeps the git repo (and every Pages build's clone step) fast and small, while text content (the thing Claude Code actually edits) stays exactly where the project requires it: as MD/MDX files in git.

**If the total legacy-URL redirect count is confirmed to exceed ~2,000 static rules once the URL crawl/export is complete:**
- Move from a single `_redirects` file to Cloudflare **Bulk Redirects** (a separate product designed for "hundreds of thousands of URL redirects," configurable via API/Terraform, sits in front of Pages at the edge).
- Keep `_redirects` for the small set of structural redirects (nav restructuring, trailing slashes) and use Bulk Redirects for the bulk 1:1 article-URL mapping.

**If a richer "browse by issue / author / topic" experience is needed beyond static category pages:**
- Add an `@astrojs/react` island that reads a build-time-generated JSON index (all article metadata, produced by a small script during `astro build`) and offers client-side filtering — still zero backend, since the JSON is static and ships in the build output.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `astro@7.2.0` | Node `>=22.12.0`, npm `>=9.6.5`, pnpm `>=7.1.0` | Verified via `npm view astro engines`. Confirm the Cloudflare Pages build image's Node version is pinned to ≥22.12 (set via a `.node-version` file or Pages' build environment variable) or the build will fail. |
| `@astrojs/mdx@7.0.5` | `astro@^7` | Major-version-paired with Astro; do not mix an older `@astrojs/mdx` with Astro 7. |
| `@astrojs/react@6.0.2` | `astro@^7`, `react@^19`, `react-dom@^19` | React islands require React 19; older React 18 projects would need `@astrojs/react@^5`. |
| `astro-pagefind@2.0.1` | `pagefind@1.5.x`, `astro@^5 \|\| ^6 \|\| ^7` | Pagefind 1.5.0 introduced component-based UI; the older `astro-pagefind/components/Search.astro` path is now in maintenance mode — use the new Pagefind UI component pattern from the astro-pagefind README, not the legacy component. |
| `@tailwindcss/vite@4.3.3` | `tailwindcss@^4`, any Vite-based framework (Astro included) | Tailwind v4 is CSS-first (`@import "tailwindcss"` in a CSS file) — do not scaffold a `tailwind.config.js` expecting v3 syntax. |
| `@astrojs/cloudflare` (adapter) | **Not required** for this project | Only needed for on-demand/SSR rendering on Cloudflare. A pure `output: 'static'` Astro site needs no adapter at all — Cloudflare Pages just serves `dist/`. Listed here only to explicitly rule it out, since some tutorials assume it's always needed. |

## Sources

- `npm view astro / @astrojs/mdx / @astrojs/react / @astrojs/sitemap / @astrojs/cloudflare / @tailwindcss/vite / pagefind / astro-pagefind / astro-og-canvas / lucide-astro / motion version` and `engines` — HIGH confidence, live npm registry, 2026-08-10
- Context7 `/withastro/astro`, `/withastro/docs` — resolved, confirms Astro 6.3.x/7.x line is current
- [Astro Blog](https://astro.build/blog/) — confirms Astro 7.2 current, Astro 6 native Fonts API, Astro 7 alpha→stable timeline — HIGH
- [Astro Docs — Cloudflare deploy guide](https://docs.astro.build/en/guides/deploy/cloudflare/) — confirms no adapter needed for static output — HIGH
- [Cloudflare Pages — Redirects docs](https://developers.cloudflare.com/pages/configuration/redirects/) — `_redirects` limits (2,000 static + 100 dynamic = 2,100 total, 1,000 char/line, no query-string matching), Bulk Redirects as the scale-up path — HIGH
- [Cloudflare Pages — Platform limits](https://developers.cloudflare.com/pages/platform/limits/) — 25 MiB max file size, 20,000 files (free) / 100,000 (paid) — HIGH
- [Cloudflare press release — Astro acquisition](https://www.cloudflare.com/press/press-releases/2026/cloudflare-acquires-astro-to-accelerate-the-future-of-high-performance-web-development/) and [Astro's own announcement](https://astro.build/blog/joining-cloudflare/) — Jan 16, 2026 acquisition, Astro remains MIT/open-source — HIGH
- [Pagefind official site](https://pagefind.app/) and [Pagefind GitHub issue #49 — large-site performance](https://github.com/Pagefind/pagefind/issues/49) — index size/performance at scale, Web Worker improvements — MEDIUM-HIGH (GitHub issue is community-reported, core claims match official docs)
- WebSearch: "Cloudflare Pages vs Workers 2026" (multiple sources, cross-verified) — Workers now Cloudflare's default recommendation for new projects generally, but Pages explicitly still recommended for content-first/git-push sites — MEDIUM (synthesized from multiple third-party comparison articles, directionally consistent, not a single official Cloudflare statement)
- WebSearch: "Astro vs Eleventy vs Hugo 2026" — page-count thresholds where each SSG's tradeoffs shift — MEDIUM (third-party comparison pieces, consistent with Astro/Eleventy's own stated design goals)
- WebSearch: "Next.js output export limitations" cross-referenced with [Next.js official static-export docs](https://nextjs.org/docs/app/guides/static-exports) — HIGH for documented constraints (ISR incompatibility, `generateStaticParams` requirement), MEDIUM for community-reported hosting quirks

---
*Stack research for: BRF static archive site migration (Squarespace → Astro/Cloudflare Pages)*
*Researched: 2026-08-10*
