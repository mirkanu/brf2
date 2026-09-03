# R2 asset upload

PDFs and MP3s are served from Cloudflare R2, not from the repo. This
file is the canonical reference for the upload process used by WS-2.4.

## Bucket

- Name: `brf2-assets` (locked 2026-09-02; was `brf` in earlier draft)
- Account: project's Cloudflare account (connected via Wrangler).
- Tier: free. Upgrade when total stored bytes exceed 8 GB.

## Keys

| Kind | Key pattern | Public URL |
|------|-------------|------------|
| Issue PDF | `pdfs/issues/issue-NN.pdf` | `https://r2.brf.org/pdfs/issues/issue-NN.pdf` |
| Article PDF | `pdfs/articles/{article-id}.pdf` | `https://r2.brf.org/pdfs/articles/{article-id}.pdf` |
| Conference MP3 | `mp3/conferences/{year}/{slug}.mp3` | `https://r2.brf.org/mp3/conferences/{year}/{slug}.mp3` |

Public URL host switches to `britishreformed.org/files/…` after the
CNAME goes live (Phase 4).

## Upload process

1. **Inventory** — `scratch/phase-2/pdf-urls.csv` lists every `pdfUrl`
   /`pdfLink` value from `src/content/journal-issues/*.json` and
   `src/content/journal/*.json`. Columns: `kind, id, source_url, target_key`.
2. **Fetch** — download the source PDF from the Squarespace URL listed
   in the CSV (HEAD-probe for byte size; GET for the file).
4. **Upload** — `wrangler r2 object put brf2-assets/<target-key> --file <local>`
   with ~20 concurrent uploads. Idempotent: re-running overwrites with
   the same bytes.
4. **Rewrite content** — update the `pdfUrl` / `pdfLink` field in the
   JSON to the public R2 URL. Keep the original Squarespace URL in a
   new `legacyPdfUrl` field for rollback.
5. **Verify** — HEAD-probe each new R2 URL; expect 200 OK. Sample-load
   10 random PDFs in a browser to confirm rendering.

## Script reference

- Inventory builder + uploader: `scratch/phase-2/upload-r2.ts` (run
  with `bun run scratch/phase-2/upload-r2.ts`). Concurrent batched
  uploads (~20 in flight), progress to stderr, summary CSV written on
  completion.
- R2 sizing estimate (Phase 1.5): `.planning/PHASE-1.5-SIZING.md`.
- Free-tier rationale and 8 GB upgrade trigger: STATUS.md, "Locked
  decisions".

## Rollback

If a PDF renders incorrectly, restore the original Squarespace URL
from `legacyPdfUrl`. Re-upload is idempotent, so re-running the
uploader with corrected bytes is also safe.

## Parked

- MP3 upload (conference talks) — blocked by missing Squarespace
  export. Conference MP3 fields stay empty until the export is found.