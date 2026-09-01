# Conferences needing description (WS-2.3)

These JSON files lack a `description` field. Listed below with the reason they were skipped.

| File | year | primaryCategory | reason |
| --- | --- | --- | --- |
| category-a-review-of-the-2010-brf-conference.json | 2010 | review | review entry (a synthetic description would duplicate the title) |
| category-assurance-castlewellan-n-ireland-2002.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-be-ye-holy-the-reformed-doctrine-of-sanctification-gartmore-house-scotland-2014.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-behold-i-come-quickly-the-reformed-biblical-doctrine-of-the-end-castlewellan-castle-2016.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-impressions-of-the-british-reformed-fellowship-family-holiday-conference-high-leigh-hertfordshire-13-20-august-2004.json | 0 | review | review entry (a synthetic description would duplicate the title) |
| category-keeping-gods-covenant-high-leigh-england-2004.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-review-1-lori-schipper.json | 0 | review | review entry (a synthetic description would duplicate the title) |
| category-review-2-anna-huizinga.json | 0 | review | review entry (a synthetic description would duplicate the title) |
| category-review-of-2006-brf-family-conference.json | 2006 | review | review entry (a synthetic description would duplicate the title) |
| category-review-of-the-2014-brf-family-conference-by-a-young-adult-from-singapore-9d9em.json | 2014 | review | review entry (a synthetic description would duplicate the title) |
| category-review-of-the-2014-brf-family-conference-by-a-young-adult-from-singapore.json | 2014 | review | review entry (a synthetic description would duplicate the title) |
| category-sovereign-grace-galasheils-scotland-1994.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-antithesis-ballymena-n-ireland-2003-mini-conference.json | 2003 | lectures | missing theme (no factual anchor) |
| category-the-church-ashburnham-england-1996.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-covenant-of-grace-bangor-n-ireland-1992.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-five-points-of-calvinism-cloverly-hall-england-2006.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-kingdom-of-god-cefn-lea-wales-2000.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-last-things-castlewellan-n-ireland-1998.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-word-of-god-for-our-generation-hebron-hall-wales-2010.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-the-work-of-the-holy-spirit-the-share-centre-n-ireland-2008.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-then-comes-the-end-the-reformed-doctrine-of-eschatology-england-2024.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-union-with-jesus-christ-n-ireland-2022.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |
| category-ye-shall-be-my-witnesses-lorne-house-northern-ireland-2012.json | 0 | lectures | year=0 (likely duplicate lecture entry; year unsafe to assert in prose) |

Total: 23 JSON files.

## Review .md orphans

43 review .md files exist in src/content/conferences/ but are NOT loaded by the conferences glob (which only matches **/*.json) and do not match the journal schema (the journal collection expects legacyPath/datePublished/authors/tags/rawCategories/primaryCategory/section etc., and these review .md files have different frontmatter and section=conference). They are currently un-routed.

Options to route them (kept flat per task constraint — do not add a new collection):

1. Move these .md files into a dedicated conferences-reviews/ folder and add it to the journal collection as a parallel load, with section=literature.
2. Switch the conferences glob to also load .md, with an alternate schema accepting markdown frontmatter for legacy review entries.
3. Migrate these reviews into the journal collection directly with section=literature.

Recommendation: option (1) is the smallest blast radius — single collection entry, no journal schema change. Deferred to a follow-up workstream.
