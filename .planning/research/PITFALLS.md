# Pitfalls Research

**Domain:** Squarespace-to-static-site migration of a large religious/scholarly journal archive (britishreformed.org — 77 issues, 413+ articles, 346 OCR'd PDFs, 18+ conference pages, DNS-only domain cutover, Cloudflare Pages hosting)
**Researched:** 2026-08-10
**Confidence:** MEDIUM-HIGH (official docs + multiple corroborating community/industry sources; no case study of this exact site found, so specifics are inferred from general Squarespace/OCR/DNS/Cloudflare patterns)

## Critical Pitfalls

### Pitfall 1: Redirect map built too late, or built from an incomplete URL inventory

**What goes wrong:**
Teams start building the new site first and treat the 301 redirect map as a launch-week checklist item. Because the old site's URL structure (category filters like `/journal/articles?category=Issue+77`, per-author and per-topic archive pages, paginated collections) is only discoverable by crawling the *live* site, any URL inventory done casually (e.g., just listing nav-visible pages) misses the long tail — old blog-style permalinks, tag/category combination URLs, and orphaned pages no longer linked from nav but still indexed by Google. Missing even 10-15% of URLs in a 400+ article archive means dozens of dead links and de-indexed pages.

**Why it happens:**
Squarespace's dynamic collection URLs (category filters, pagination, author archives) aren't listed anywhere in the CMS — they only exist as generated routes. There's no "export all URLs" button. Teams default to redirecting only the URLs they remember or find in the main nav, not the ones Google actually has indexed.

**How to avoid:**
Before any content extraction begins, pull the *complete* current URL inventory from three independent sources and reconcile them: (1) Google Search Console's indexed-URL list (or `site:britishreformed.org` search results if GSC isn't available), (2) a full crawl of the live site via the Playwright daemon following every link including pagination and category filters, and (3) the existing sitemap.xml Squarespace auto-generates. Treat any URL present in only one of the three sources as suspicious and verify manually. Build the redirect map as a living spreadsheet from day one of the ingestion phase, not the pre-launch phase.

**Warning signs:**
- Redirect map row count is suspiciously close to a "round number" (e.g., exactly the nav page count) rather than reflecting category/tag permutations
- No Google Search Console export or `site:` search was done before crawling
- Article count in the redirect map doesn't match the 413+ articles / 346 PDFs figures already known from PROJECT.md

**Phase to address:**
Content-ingestion / redirect-mapping phase — must happen *before* the new site's URL scheme is finalized, since the new scheme needs to be a redirect *target*, not decided independently.

---

### Pitfall 2: Treating Squarespace's native XML export as a starting point instead of skipping it

**What goes wrong:**
Squarespace's Settings > Advanced > Import/Export only exports one primary blog collection as WordPress-format XML, with no images, no design, no PDFs reliably, and no support for multiple collections (this site has Journal, Conferences, Other Resources, Translations — at least four distinct collections). Teams sometimes still start here "to save time," get a partial XML for one collection, and then discover mid-project that Conferences, Literature, Translations, and BRF News Alert were never captured — requiring a second extraction pass with different tooling and inconsistent data shapes between the two passes.

**Why it happens:**
The export option is prominently visible in Settings and looks authoritative ("this is Squarespace's own export tool"), so it's a natural first instinct even when the site structure obviously has multiple collections.

**How to avoid:**
Per PROJECT.md, this has already been correctly identified as non-viable and crawling has been chosen as the extraction method. The pitfall to still guard against: designing the crawler's data model as if each *page type* (article, issue index, conference page, translation, news item) needs its own extraction template with fields validated against what's actually present in that content type — not one generic "blog post" scraper reused everywhere with fields silently null for non-blog content types.

**Warning signs:**
- Crawler code has a single generic content extractor applied to Journal, Conferences, Literature, and Translations pages alike
- Extracted records show empty/null fields (author, date, category) for entire content types, not just occasional missing data

**Phase to address:**
Content-ingestion phase — design the crawler with per-collection extraction templates from the start.

---

### Pitfall 3: Crawler misses JS-rendered or paginated content, producing a silently incomplete archive

**What goes wrong:**
Squarespace collection pages (especially filtered views like `/journal/articles?category=Issue+77` and any "load more" or infinite-scroll article listings) render content via JavaScript after initial page load. A crawler that fetches raw HTML (not a headless browser) will see the page shell but miss articles loaded dynamically. Even with a headless browser (the Playwright daemon), a crawler with insufficient wait-for-content logic, no explicit stop condition on pagination, or reliance on "click next" that silently fails will finish "successfully" with an incomplete dataset — no errors thrown, just fewer articles than actually exist.

**Why it happens:**
Scripts that "finish without errors" are assumed correct. Nothing about a truncated crawl looks broken from the outside — the crawler exits cleanly, the output file is non-empty, and only a manual count against the known "413+ articles" figure would catch the gap.

**How to avoid:**
Every crawl run must be validated against an independent count: total articles found must reconcile against 413+ (from PROJECT.md) and 77 issues, with any discrepancy investigated before proceeding. Use the Playwright daemon with explicit `waitUntil: 'networkidle'` (already the pattern used elsewhere in this environment) and explicit stop conditions on any paginated/filtered listing (stop on empty result set or repeated content, not a fixed page count guess). Where possible, discover the underlying data (Squarespace often exposes collection data as JSON in page `<script>` tags or via a `?format=json` query param on collection URLs) rather than scraping rendered DOM — this is both faster and less brittle.

**Warning signs:**
- Final extracted article count doesn't match 413+ / issue count doesn't match 77
- Crawl log shows no explicit "stop condition met" confirmation, just "loop ended"
- Spot-checking 5-10 known article URLs against the extracted dataset turns up any that are missing

**Phase to address:**
Content-ingestion phase, with a mandatory reconciliation/QA step before moving to publishing.

---

### Pitfall 4: OCR text corruption from column layout, footnotes, and hyphenation goes unreviewed before publishing

**What goes wrong:**
The 346 source PDFs are scanned theological journal pages — commonly two-column layouts with footnotes in smaller type at the page bottom, archaic English typesetting, and embedded Greek/Hebrew snippets. Generic OCR (without layout-aware processing) reads left-to-right/top-to-bottom across the *whole page*, jumbling column text mid-sentence (reading a fragment of column 1, then a fragment of column 2, then back), losing the correct reading order. End-of-line hyphenation ("right-\neousness") frequently isn't rejoined into "righteousness." Footnote markers (superscript numbers) are often dropped or converted to inline numbers indistinguishable from body text, orphaning footnote content from its reference point or merging it into the body paragraph. Greek/Hebrew snippets embedded in English text are especially error-prone since general-purpose OCR isn't trained on mixed-script pages — expect garbled Unicode, dropped diacritics/accents, or complete substitution with visually similar Latin characters.

**Why it happens:**
OCR output "looks like text" — a wall of characters that superficially resembles the article — so it's easy to publish without close reading. The failure isn't a crash, it's silently wrong content: jumbled paragraph order, footnotes merged into body text, or Greek words turned into nonsense strings. For a 400+ article corpus, no one will proofread every single article word-for-word before launch unless it's built into the process.

**How to avoid:**
Do not treat OCR output as publish-ready. (1) Confirm what OCR tool Vellum-VPS is running and whether it does layout-aware/column-aware extraction (tools like layout-aware OCR pipelines or GROBID-style academic-document processors handle multi-column + footnotes far better than generic Tesseract) — if it's a generic OCR pass, budget for a post-processing/cleanup phase, not just a straight import. (2) Build automated de-hyphenation and paragraph-reflow as a scripted cleanup pass rather than manual fixing. (3) Flag any page containing non-Latin Unicode ranges (Greek/Hebrew) for manual spot review rather than trusting OCR on those spans. (4) Sample-audit a statistically meaningful subset (e.g., 20-30 articles spanning different eras/print quality) against the source PDF before considering the pipeline "done," and specifically check footnote-to-marker association, not just body text.
Since PROJECT.md flags "OCR output format not yet known" as an open dependency, this pitfall should directly inform that inspection: the first thing to check when OCR output arrives is whether column order and footnotes survived correctly on a few known-hard sample pages, before building the ingestion pipeline around that output format.

**Warning signs:**
- Random spot-check of an article shows sentences that don't logically follow each other (a symptom of columns being read out of order)
- Footnote numbers appear as inline digits in the middle of body sentences
- Greek/Hebrew spans render as question marks, boxes, or nonsense Latin-lookalike characters
- Hyphenated words appear split across two lines with no rejoining ("king-\ndom" instead of "kingdom")

**Phase to address:**
Content-ingestion phase, specifically as a required QA gate between "OCR output received" and "article published" — this is likely substantial enough to warrant its own phase or sub-phase given the corpus size, rather than being folded silently into general ingestion.

---

### Pitfall 5: DNS cutover breaks email or causes an avoidable outage window because MX records aren't audited first

**What goes wrong:**
Even though PROJECT.md notes this is a DNS-only cutover with the domain staying put, "DNS-only" changes still touch the whole zone file, and it's common to overwrite or drop MX (and supporting SPF/DKIM/DMARC TXT) records when updating A/CNAME records for the new host — especially if the cutover is done via a full zone replacement rather than surgical record edits. If britishreformed.org currently has any working email (even a simple forward or "Contact Us" mailto that resolves through a real mailbox), a dropped MX record causes silent mail bounces that aren't discovered until someone complains weeks later.

**Why it happens:**
"We're only changing DNS" is misread as "we're only changing the A record," but zone edits are often done as bulk imports/replacements in DNS management UIs, which can wipe unrelated records if the import file doesn't include them.

**How to avoid:**
Before touching any DNS record, export/document the *complete current zone* for britishreformed.org (all record types: A, AAAA, CNAME, MX, TXT/SPF, DKIM, DMARC, NS). Confirm explicitly whether the "Contact Us" mailto address is backed by real mail hosting (Squarespace's Google Workspace integration, or an external provider) or is a dead-end address. If real email exists, replicate its MX/SPF/DKIM records on the new DNS setup *before* cutover, and never touch MX records as part of the same change that updates the website A/CNAME records — treat them as two separate, independently-verified changes. Lower TTLs on the records being changed 24-48 hours ahead of cutover so any rollback is fast.

**Warning signs:**
- No documented export of the current DNS zone exists before cutover begins
- Unclear whether "Contact Us" / "info@britishreformed.org"-style addresses are live mailboxes or just static text
- DNS changes are made via a single bulk zone import rather than targeted per-record edits

**Phase to address:**
Domain-cutover phase — but the zone audit itself (documenting what currently exists, including email) should happen early, ideally during initial site research, not on cutover day.

---

### Pitfall 6: 301 redirect count exceeds Cloudflare Pages' `_redirects` static limit, silently dropping redirects past line ~2,000 (or ~444 in some real-world reports)

**What goes wrong:**
A `_redirects` file on Cloudflare Pages supports up to 2,000 static + 100 dynamic redirects (2,100 combined), each declaration capped at 1,000 characters, and redirect order matters (first match wins). For this site, the redirect map could plausibly approach or exceed this: 413+ article URLs + 77 issue-category URLs + author-archive URLs + topic-archive URLs + 18+ conference URLs + literature/translations/news pages could total well over 1,000, and some Squarespace sites generate additional pagination and filter-combination URLs that inflate the count further. There is also at least one community-reported real-world case where a Cloudflare Pages `_redirects` file stopped working correctly past 444 lines despite the documented 2,000-line limit — meaning even staying under the official limit isn't a guaranteed safety margin.

**Why it happens:**
The `_redirects` file "looks like it's working" in local testing with a handful of test URLs, so the file-size ceiling isn't discovered until the full redirect map is deployed and older/lower-priority URLs stop resolving — which may not be noticed until Search Console reports a spike in 404s weeks later.

**How to avoid:**
Count the total redirect map size early (during the redirect-mapping phase, not at launch) and if it's likely to approach even a few hundred entries, plan to use Cloudflare's Bulk Redirects feature (rules-engine-based, supports far more entries, officially up to several million on paid tiers, nominally 10,000 on Free — though note community reports of Free-plan accounts still being capped at the old 20-item limit due to an incomplete rollout, so this must be verified directly in the account's dashboard, not assumed from docs). Do not split the redirect map casually between `_redirects` and Bulk Redirects without a clear, tested rule for which URLs go where — pick one primary mechanism and use it consistently, falling back to the other only if a hard limit is hit. Test the *actual deployed* redirect count against a real crawl post-launch, not just a manual sample.

**Warning signs:**
- Redirect map has more than a few hundred rows and no explicit decision has been made about `_redirects` vs Bulk Redirects
- Cloudflare account's actual Bulk Redirects quota hasn't been checked in-dashboard (docs say 10,000 free-tier, but real accounts have been seen capped at 20)
- No automated post-launch check that every URL in the redirect map actually returns a 301 (as opposed to spot-checking a handful)

**Phase to address:**
Redirect-implementation phase (immediately pre-launch) — but the *sizing* decision should be made as soon as the redirect map is substantially complete, so there's time to request a Cloudflare quota increase if needed before cutover day.

---

### Pitfall 7: Google/Google Scholar de-indexes archive content because the old site goes dark before redirects propagate and get re-crawled

**What goes wrong:**
For an established journal archive, some articles may already be indexed in Google Scholar (which recrawls only ~2x/year and permanently drops documents it can't re-access on a recrawl) and Google Search. If the DNS cutover happens abruptly — old Squarespace site stops responding at the same moment DNS points to the new host, with 301s only live on the new site — there's a window where old, still-cached URLs from search results/citations 404 on the new host if any redirect rules are missing, wrong, or not yet propagated globally, causing those pages to be dropped from the index. Because Scholar's recrawl cycle is infrequent, a page missed during a recrawl-timing-unlucky window can stay out of the index for months to a year before being picked up again — largely unrecoverable in any short timeframe.

**Why it happens:**
DNS propagation is not instantaneous or globally synchronized; some resolvers will serve the new site before others, and if the redirect map has any gaps (see Pitfall 1) at the exact moment a crawler visits, that URL may be recorded as broken rather than moved.

**How to avoid:**
Do not treat "redirect map built" and "redirect map deployed and verified" as the same milestone. Deploy and fully verify (crawl every old URL in the map, confirm each returns a 301 to a 200-status new URL, zero exceptions) *before* flipping DNS. Where feasible, keep the old Squarespace site reachable (even briefly, on a temporary subdomain or via Squarespace itself) for a short overlap window so any redirect gaps discovered post-cutover can be patched before the old host is fully decommissioned. After cutover, immediately submit the new sitemap to Google Search Console and use the URL Inspection tool to request re-indexing of key/high-value pages (won't help Scholar directly, but confirms Search-side health). Ensure new article pages carry the same or improved `citation_title`/`citation_author`/`citation_pdf_url` style meta tags if any pages were ever academically cited, and keep each PDF at a stable, unique URL — don't consolidate multiple articles' PDFs behind one dynamic URL.

**Warning signs:**
- Cutover plan doesn't include a "verify every redirect resolves with 200 status before flipping DNS" step
- No plan exists to keep the old site reachable even briefly during the transition
- No post-launch Search Console monitoring plan for 404 spikes in the weeks after cutover

**Phase to address:**
Cutover phase for execution, but the *verification tooling* (a script that crawls the full redirect map and confirms every entry resolves) should be built during the redirect-mapping phase so it's ready to run repeatedly before and after cutover.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Skip layout-aware OCR cleanup, publish raw OCR text as-is | Faster to launch, no extra tooling | Garbled columns/footnotes/Greek permanently embedded in a "finished" archive that's unlikely to get a second cleanup pass once live | Never for this project — it's a permanent scholarly archive, not disposable content |
| Redirect everything unmapped to homepage as a catch-all | Quick to implement, "nothing 404s" | Google treats mass homepage redirects as soft 404s and de-indexes the pages anyway — same SEO damage as no redirect, just hidden | Never — always map to the closest actual equivalent page |
| Use `_redirects` file only, skip Bulk Redirects even if map exceeds a few hundred entries | Simpler single-file config | Redirects past the practical limit (as low as ~444 lines per real-world reports) silently stop working | Only acceptable if redirect map is confirmed well under 400 entries after dedup |
| Manually spot-check a handful of crawled articles instead of reconciling total count against known 413+/77 figures | Saves QA time | Silent gaps in the archive (missing articles) that are hard to detect after the old site is decommissioned | Never — reconciliation against known totals is cheap and must be automated |
| Treat DNS cutover as one bulk zone import | Fast, one operation | Risk of silently dropping MX/SPF/DKIM records if email exists | Only acceptable if zone is confirmed to have zero email records in use |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Squarespace crawl (Playwright daemon) | Scraping rendered DOM only, missing category/pagination JSON endpoints Squarespace exposes (`?format=json` on collection URLs) | Inspect network requests first; prefer structured JSON endpoints over DOM scraping where Squarespace exposes them — faster and less brittle |
| Cloudflare DNS + Pages | Assuming Cloudflare's own domain hosts both DNS and Pages automatically stay in sync during cutover | Explicitly verify DNS record changes and Pages custom-domain attachment are each independently confirmed, not assumed from "same account" |
| Cloudflare Bulk Redirects (Free plan) | Assuming documented 10,000-redirect quota is live on the actual account without checking the dashboard | Check the account's actual Bulk Redirects quota in-dashboard before relying on it; file a support ticket early if capped at the old 20-item limit |
| Google Search Console / Scholar | Submitting sitemap and considering SEO preservation "done" | Actively monitor GSC for 404/coverage errors for 30+ days post-launch; Scholar has no equivalent dashboard, so rely on redirect correctness instead |
| Vellum-VPS OCR pipeline (SSH) | Pulling OCR output and ingesting it directly into the static site pipeline without inspecting format/quality first | Treat OCR output arrival as a research checkpoint: sample-inspect hard pages (columns, footnotes, Greek/Hebrew) before building the ingestion parser around it |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Cloudflare Pages file-count limit | Deploy fails or silently truncates assets once total file count is high | 20,000 files on Free plan, 100,000 on paid plans (requires `PAGES_WRANGLER_MAJOR_VERSION=4`) — count PDFs + article pages + images + search index shards before assuming Free plan is sufficient | 300+ PDFs + 413+ article pages + Pagefind search index shards + images could add up meaningfully; unlikely to hit 20,000 alone but worth a pre-launch count, especially if Pagefind or images multiply file count |
| Single 25 MiB asset size cap | Individual large PDF fails to deploy | Cloudflare Pages caps a single file at 25 MiB — verify no scanned PDF (especially multi-article scans) exceeds this before relying on direct hosting; consider R2 for oversized PDFs (R2 already planned for audio) | Any scanned PDF from an older, image-heavy print run could plausibly exceed 25 MiB |
| Build minutes / build count limit | Frequent small content commits (413+ articles migrated incrementally) burn through Free plan's 500 builds/month | Batch content migration commits rather than one commit per article if triggering full rebuilds each time | Relevant during the bulk migration phase specifically, not steady-state |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Leaving old Squarespace site's robots.txt/AI-bot-blocking settings unreviewed during migration | Old site may already fully block crawlers (if "Block known AI crawlers" was ever toggled), which would also affect legitimate re-crawling of redirects post-cutover if inherited into new site config by copy-paste | Set new site's robots.txt deliberately, don't inherit blindly from old Squarespace settings |
| Crawling the live site aggressively without rate-limiting | Could trigger Squarespace's own bot/rate-limit defenses (429s), or look like an attack from Squarespace's infrastructure perspective, risking IP-level blocks mid-extraction | Throttle the Playwright daemon's crawl requests, add delays between requests, avoid parallel hammering of the same collection endpoint |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Redirecting old category/filter URLs (e.g., `/journal/articles?category=Issue+77`) to a generic search page instead of the equivalent new issue page | Visitors and search engines following old links land somewhere unrelated to what they expected, increasing bounce and signaling "broken" to Google | Map each old category/filter URL to its precise new-site equivalent (issue archive, author archive, topic archive) — this was explicitly called out as URL patterns worth preserving in PROJECT.md |
| Publishing OCR'd articles with garbled Greek/Hebrew snippets or misplaced footnotes without any visual flag | Scholarly readers immediately notice corrupted quotations from primary sources, undermining trust in the whole archive | QA-gate OCR output for non-Latin script spans and footnote association before publishing, per Pitfall 4 |

## "Looks Done But Isn't" Checklist

- [ ] **Redirect map:** Often "done" means "nav pages mapped" — verify it also covers category/filter/pagination/author/topic archive URLs and every one of the 413+ article + 346 PDF URLs individually, not just issue-level pages
- [ ] **OCR'd article text:** Often "done" means "text extracted, file exists" — verify column reading order, footnote-to-marker association, hyphenation rejoining, and Greek/Hebrew span integrity on a real sample, not just that a text file was produced
- [ ] **DNS cutover:** Often "done" means "site loads on new host" — verify email (if any) still works, verify TTLs were pre-lowered and can be raised again post-stability, verify the *entire* old zone (not just A/CNAME) was audited and preserved where needed
- [ ] **Redirect deployment:** Often "done" means "redirect rules exist in config" — verify every rule actually resolves with a live crawl (old URL → 301 → 200 on new URL), not a manual spot-check of a few URLs
- [ ] **SEO preservation:** Often "done" means "301s exist" — verify sitemap submitted to Search Console, key pages resubmitted for re-indexing, and a 30-day post-launch monitoring window is actually being watched, not just configured once
- [ ] **Cloudflare Pages redirects at scale:** Often "done" means "redirects work in local testing" — verify the actual deployed redirect count against the platform's real (dashboard-confirmed, not just documented) quota

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Missing redirects discovered post-cutover | LOW-MEDIUM | Add missing rules to Bulk Redirects/`_redirects`; since old Squarespace site is decommissioned, rely on Search Console 404 reports and referrer logs to find what's actually being hit, then patch |
| OCR corruption discovered after articles are already published | MEDIUM-HIGH | Re-run cleanup pass against source PDFs for affected articles; since content is file-based in git (per PROJECT.md), corrections are straightforward commits, but discovering *which* of 413+ articles are affected without systematic re-audit is the expensive part |
| Email broken post-cutover (dropped MX) | LOW, if caught within TTL window | Restore correct MX/SPF/DKIM records immediately; low TTLs (pre-lowered before cutover) mean fast propagation of the fix; senders using SMTP typically retry for hours-to-days, so brief windows are often recoverable without permanent mail loss |
| Google Scholar drops indexed articles | HIGH, potentially unrecoverable in <1 year | Ensure redirects are correct going forward and wait for the next Scholar recrawl cycle (roughly semi-annual); no expedited re-indexing mechanism exists for Scholar specifically (unlike Google Search's URL Inspection tool) |
| Cloudflare Pages redirect limit silently exceeded | LOW-MEDIUM | Migrate overflow redirects to Bulk Redirects (rules engine), verify with a full crawl re-test |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Incomplete/late redirect map (P1) | Content-ingestion / redirect-mapping phase | Redirect map row count reconciles against GSC index export + full crawl + sitemap.xml, all three cross-checked |
| Native export misuse / inconsistent per-collection extraction (P2) | Content-ingestion phase | Each content type (Journal, Conferences, Literature, Translations, News) has its own extraction template with no null-heavy fields |
| Crawler missing JS/paginated content (P3) | Content-ingestion phase | Extracted article/issue counts reconcile exactly against 413+ articles / 77 issues known baseline |
| OCR corruption in published text (P4) | Content-ingestion phase, dedicated QA gate | Sample audit (20-30 articles across eras) passes column-order, footnote-association, hyphenation, and Greek/Hebrew integrity checks against source PDFs |
| DNS cutover breaks email (P5) | Domain-cutover phase (zone audit done earlier, in research) | Full current DNS zone exported and documented before any change; email status (live mailbox vs. dead link) explicitly confirmed |
| Redirect count exceeds Cloudflare limits (P6) | Redirect-implementation phase, sized as soon as map is ~complete | Actual Bulk Redirects quota checked in-dashboard; full redirect map deployed and crawled to confirm zero silent drop-offs |
| SEO/Scholar index loss during cutover (P7) | Cutover phase (tooling built during redirect-mapping phase) | Every redirect verified live (200 on target) before DNS flips; 30-day post-launch GSC monitoring actually executed |

## Sources

- [Squarespace: Maintaining your SEO ranking after moving or redesigning your site](https://support.squarespace.com/hc/en-us/articles/206543797-Maintaining-your-SEO-ranking-after-moving-or-redesigning-your-site) — HIGH confidence, official
- [Website Migration Redirects: The Complete 301 Checklist | Flyn](https://www.flyn.to/blog/website-migration-redirects) — MEDIUM confidence
- [Squarespace Migration: The 4 Technical Checks to Preserve SEO Authority](https://tracyagencyllc.com/insights/squarespace-migration-technical-seo-checks) — MEDIUM confidence
- [Squarespace: Exporting your site](https://support.squarespace.com/hc/en-us/articles/206566687-Exporting-your-site) — HIGH confidence, official (confirms single-blog, no-images, WordPress-XML-only limitations)
- [Squarespace to Self-Hosted CMS: 2026 Migration Guide — UnfoldCMS](https://unfoldcms.com/blog/squarespace-to-self-hosted-cms) — MEDIUM confidence
- [OCR++: A Robust Framework For Information Extraction from Scholarly Articles (ACL Anthology)](https://aclanthology.org/C16-1320.pdf) — HIGH confidence, peer-reviewed, directly addresses column/footnote/hyphenation extraction
- [Layout Extraction for Complex PDFs: Preserving the Structure OCR Loses | TurboLens](https://www.turbolens.io/blog/2026-04-10-layout-extraction-for-complex-pdfs-preserving-the-structure-ocr-loses) — MEDIUM confidence
- [Structure-Aware Text Recognition for Ancient Greek Critical Editions (arXiv 2603.02803)](https://arxiv.org/html/2603.02803) — HIGH confidence, peer-reviewed/preprint, directly relevant to Greek snippets in theological text
- [Reading or Guessing? Visual Grounding Failures of VLMs for OCR in Ancient Greek Editions (arXiv 2605.27750)](https://arxiv.org/pdf/2605.27750) — HIGH confidence, preprint
- [Ancient Hebrew character recognition, Isaiah dataset study](https://sipl.eelabs.technion.ac.il/projects/optical-character-recognition-ocr-for-old-torah-manuscripts/) — MEDIUM confidence
- [DNS Migration Guide | InMotion Hosting](https://www.inmotionhosting.com/blog/complete-dns-migration-guide/) — MEDIUM confidence
- [DNS TTL Best Practices For A, MX, CNAME And TXT Records | DCHost](https://www.dchost.com/blog/en/dns-ttl-best-practices-for-a-mx-cname-and-txt-records/) — MEDIUM confidence
- [Squarespace: Adding Google Workspace MX records](https://support.squarespace.com/hc/en-us/articles/360001476528-Adding-Google-Workspace-MX-records) — HIGH confidence, official
- [Squarespace: DNS records for email](https://support.squarespace.com/hc/en-us/articles/31120985010957-DNS-records-for-email) — HIGH confidence, official
- [Cloudflare Pages: Limits (official docs)](https://developers.cloudflare.com/pages/platform/limits/index.md) — HIGH confidence, official
- [Cloudflare Pages docs: Redirects](https://developers.cloudflare.com/pages/configuration/redirects/) — HIGH confidence, official
- [Cloudflare Pages _redirects limited to 444 lines — Community thread](https://community.cloudflare.com/t/cloudflare-pages-redirects-limited-to-444-lines/783174) — LOW-MEDIUM confidence (single unresolved community report, but corroborated by multiple similar threads on Bulk Redirects quota discrepancies)
- [Free plan Bulk Redirects quota limited to 20 instead of 10,000 — Community thread](https://community.cloudflare.com/t/free-plan-bulk-redirects-quota-limited-to-20-instead-of-10-000/867307) — MEDIUM confidence (multiple corroborating threads from 2025-2026)
- [Cloudflare Blog: Announcing Bulk Redirects](https://blog.cloudflare.com/maximum-redirects-minimum-effort-announcing-bulk-redirects/) — HIGH confidence, official
- [Google Scholar coverage fluctuations case study (arXiv 2102.07571)](https://arxiv.org/pdf/2102.07571) — HIGH confidence, peer-reviewed
- [ConductScience: Google Scholar Indexation for Academic Journals](https://research.conductscience.org/google-scholar-indexation-for-academic-journals/) — MEDIUM confidence
- [How to Scrape Infinite Scroll, Load More & Paginated Pages | ScrapFly](https://scrapfly.io/blog/posts/how-to-scrape-infinite-scroll-load-more-and-paginated-pages) — MEDIUM confidence
- [How to Check if Your Squarespace Site Blocks AI Bots | Francesca Tabor](https://www.francescatabor.com/articles/2025/11/7/how-to-check-if-your-squarespace-site-blocks-ai-bots-and-how-to-fix-it) — MEDIUM confidence

---
*Pitfalls research for: Squarespace-to-static-site migration, religious journal archive*
*Researched: 2026-08-10*
