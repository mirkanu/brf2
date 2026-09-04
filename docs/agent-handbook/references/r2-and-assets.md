# R2 and assets

PDFs and MP3s for the BRF site live on Cloudflare R2. Local copies in
`public/articles/` are the original pilot only — every new asset goes
to R2.

## Bucket layout

- **Bucket**: `brf2-assets`
- **Region**: WEUR (created 2026-09-01)
- **Public dev URL pattern**: `https://pub-<account-id>.r2.dev/pdfs/...`
  (the public-dev-url is the only public-read path until the custom
  domain `britishreformed.org/files/*` is wired in Phase 4)
- **Object key layout**:
  - `pdfs/issues/issue-NN.pdf` — full issue PDFs
  - `pdfs/articles/{slug}.pdf` — per-article PDFs
  - `pdfs/articles/{podcast-slug}.mp3` — podcast audio (yes, the
    prefix is `pdfs/articles/` even for MP3s — bucket layout is by
    object-type, not source collection)
  - `audio/conferences/{year}/{talk-slug}.mp3` — conference audio
    (alternative layout if/when this is split out)

## Required environment

| Variable | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Must have `Account → R2: Edit` scope. Set in [Settings → Advanced](/?t=settings&s=advanced). |

The Cloudflare MCP (`mcp:cloudflare`) exposes `tool_docs`,
`tool_search`, and `tool_execute_post`, but as of 2026-09-02 the
MCP-bound token does NOT include the r2.dev public-access scope. To
unblock: set `CLOUDFLARE_API_TOKEN` in Settings → Advanced with
`Account → R2: Edit`, or run `wrangler r2 bucket dev-url enable
brf2-assets` locally.

## Upload pipeline

When the upload script exists (WS-2.4 tracker in
`1 Projects/brf2/.planning/STATE.md`):

```bash
# From the repo root
bun scripts/migration/upload-to-r2.ts \
    /path/to/local-file.pdf \
    pdfs/issues/issue-78.pdf
```

While the script is pending, use the manual path:

```bash
# Local wrangler (auth via `wrangler login` or CLOUDFLARE_API_TOKEN)
wrangler r2 object put brf2-assets/pdfs/issues/issue-78.pdf \
    --file /path/to/issue-78.pdf
```

After upload, verify the public URL:

```bash
curl -I https://pub-<account-id>.r2.dev/pdfs/issues/issue-78.pdf
# Expect: HTTP/2 200, content-type application/pdf, content-length matches
```

Then set `pdfUrl` (or `pdfLink` where legacy applies) on the JSON
metadata to that URL.

## Asset URL conventions in rendered pages

- During dev/pre-launch: `https://pub-<id>.r2.dev/pdfs/...`
- After Phase 4 cutover: `https://britishreformed.org/files/pdfs/...`

Don't hardcode the `<id>` segment in JSON. The convention is to
embed the full URL at upload time and not refactor until cutover —
the bucket dev URL is ephemeral and the cutover replaces the prefix.

## Storage budget

Free tier: 10 GB stored, 10M Class B reads/month, 1M Class A
writes/month. No egress charges on R2.

Projected corpus (per `1 Projects/brf2/.planning/PHASE-1.5-SIZING.md`):
~2–3 GB, ceiling 5 GB. Upgrade triggers at >8 GB.

## Cache TTLs

- Article HTML: 300 s
- PDF / MP3 objects on R2: 31536000 s (1 year, immutable)
