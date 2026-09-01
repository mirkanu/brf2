#!/usr/bin/env node
/**
 * Pre-build sitemap/RSS generator.
 *
 * Walks `src/` to discover page route file paths, parses `src/content/journal/*.json`
 * to gather article metadata, then writes:
 *   - sitemap-index.xml + sitemap-N.xml
 *   - rss.xml
 *
 * Outputs go to <projectRoot>/public/ so Astro copies them to dist/ at build time.
 *
 * Optional env vars:
 *   PROJECT_ROOT   absolute path to project root   (default: /home/workspace/1 Projects/brf2)
 *   SITE_URL       canonical site origin            (default: https://brf2.pages.dev)
 *   WALK_SRC       src dir to walk                   (default: <PROJECT_ROOT>/src/pages)
 *   PUBLIC_DIR     public dir to write outputs       (default: <PROJECT_ROOT>/public)
 */
import { readdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.env.PROJECT_ROOT ?? '/home/workspace/1 Projects/brf2';
const SITE = process.env.SITE_URL ?? 'https://brf2.pages.dev';
const WALK_SRC = process.env.WALK_SRC ?? join(ROOT, 'src/pages');
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? join(ROOT, 'public');

function toRoute(absFile) {
  let rel = relative(WALK_SRC, absFile).replace(/\.(astro|md|mdx)$/, '');
  if (rel === 'index') return '/';
  return '/' + rel;
}

// Walk ASTRO pages to derive routes (best-effort: matches static, dynamic, and getStaticPaths patterns)
function collectRouteFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) collectRouteFiles(p, out);
    else if (/\.(astro|md|mdx)$/.test(entry)) out.push(p);
  }
  return out;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const routeFiles = collectRouteFiles(WALK_SRC);
const today = new Date().toISOString().slice(0, 10);

// Map static file → URL
const allUrls = routeFiles.map(p => ({
  url: SITE + toRoute(p),
  mtime: today,
}));

// articles from journal content
const articles = [];
for await (const f of glob('journal/**/*.json', { cwd: join(ROOT, 'src/content') })) {
  const j = JSON.parse(readFileSync(join(ROOT, 'src/content', f), 'utf8'));
  if (!j.datePublished) continue;
  const slug = f.replace(/^journal\//, '').replace(/\.json$/, '');
  articles.push({
    title: j.title,
    link: `${SITE}/journal/${j.issueNumber ?? 'unknown'}/${slug}/`,
    description: j.rawCategories?.join(', ') || '',
    pubDate: new Date(j.datePublished).toUTCString(),
    authors: j.authors?.join(', ') || '',
  });
}

articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
const top = articles.slice(0, 50);

// Filter dupes and API/internal
const filtered = allUrls.filter(u => {
  const p = new URL(u.url).pathname;
  if (/^\/api\//.test(p)) return false;
  if (/^\/(sitemap|rss|robots)\b/.test(p)) return false;
  return true;
});

const chunks = chunk(filtered, 1000);
const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunks.map((_, i) => `  <sitemap>\n    <loc>${SITE}/sitemap-${i + 1}.xml</loc>\n  </sitemap>`).join('\n')}
</sitemapindex>
`;
writeFileSync(join(PUBLIC_DIR, 'sitemap-index.xml'), indexXml);

chunks.forEach((c, i) => {
  const body = c.map(u => `  <url>\n    <loc>${u.url}</loc>\n    <lastmod>${u.mtime}</lastmod>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  writeFileSync(join(PUBLIC_DIR, `sitemap-${i + 1}.xml`), xml);
});

const rssItems = top.map(a => `    <item>
      <title>${a.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
      <link>${a.link}</link>
      <description>${a.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</description>
      <pubDate>${a.pubDate}</pubDate>
      ${a.authors ? `<dc:creator>${a.authors.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</dc:creator>` : ''}
    </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>British Reformed Journal</title>
    <link>${SITE}/journal/</link>
    <description>Articles from the British Reformed Journal</description>
    <language>en-gb</language>
${rssItems}
  </channel>
</rss>
`;
writeFileSync(join(PUBLIC_DIR, 'rss.xml'), rss);

console.log(`Wrote ${chunks.length} sitemap chunk(s), rss.xml (${top.length} items)`);
