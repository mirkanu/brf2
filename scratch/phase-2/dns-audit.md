# DNS audit — brf2.pages.dev

- **Audit date:** 2026-09-02 08:51 UTC (refresh of prior 08:18 UTC log)
- **Workstream:** WS-2.7
- **Target:** `brf2.pages.dev` (Cloudflare Pages)

## Result: PASS

`brf2.pages.dev` is live, served by Cloudflare Pages, and resolves to
Cloudflare-owned IPs across IPv4 and IPv6. The apex does not publish a CNAME;
Cloudflare Pages serves the apex directly via A/AAAA on Cloudflare's anycast
edge — that is the expected `<project>.pages.dev` setup.

## Lookup table

| Lookup | Command | Result |
| --- | --- | --- |
| CNAME | `dig +short brf2.pages.dev CNAME` | (empty — apex, no alias) |
| A | `dig +short brf2.pages.dev A` | `172.66.44.157`, `172.66.47.99` |
| AAAA | `dig +short brf2.pages.dev AAAA` | `2606:4700:310c::ac42:2f63`, `2606:4700:310c::ac42:2c9d` |
| NS | `dig +short brf2.pages.dev NS` | `addilyn.ns.cloudflare.com.`, `toby.ns.cloudflare.com.` |

## IP ownership

`whois 172.66.44.157`:

- NetRange: `172.64.0.0 - 172.71.255.255`
- CIDR: `172.64.0.0/13`
- NetName: `CLOUDFLARENET`
- Organization: **Cloudflare, Inc. (CLOUD14)**

Both A records fall inside the `172.64.0.0/13` Cloudflare allocation. The
AAAA records live in Cloudflare's `2606:4700::/32` block. The NS records are
Cloudflare's authoritative nameservers. There is no third-party DNS or
hosting in the path.

## Live HTTP check

`curl -sI https://brf2.pages.dev/`:

```
HTTP/2 200
server: cloudflare
cf-ray: a34b46077c4ac957-IAD
cache-control: public, max-age=0, must-revalidate
```

`server: cloudflare` + `cf-ray` confirm Pages is currently serving from the
edge. The current HTML `Cache-Control` matches the `/*.html` policy in
`public/_headers` (`public, max-age=0, must-revalidate`) — once the new
`_headers` is deployed, behavior is unchanged for HTML and the `/_astro/*`
long-cache rule will apply to hashed assets.

## Project existence

Cloudflare Pages binds each project to `<project>.pages.dev`. The apex
hostname `brf2.pages.dev` implies the `brf2` project, and the apex responds
200 to a HEAD request — confirming the project is currently deployed and
serving. `wrangler` is not installed in this environment; no API token is
available, so the project existence check falls back to the HEAD response +
nameserver / IP evidence above, which is conclusive.

## Verdict

DNS is correctly delegated to Cloudflare and the apex is fronted by Cloudflare
edge. No follow-up actions required for WS-2.7.
