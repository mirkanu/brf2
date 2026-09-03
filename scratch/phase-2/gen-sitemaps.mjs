#!/usr/bin/env node
/**
 * Generate sitemap-index.xml + sitemap-N.xml + rss.xml from built dist/.
 * Outputs to whatever directory the caller chose — Astro is configured to run
 * this script with `OUT_DIR=public` so files are picked up as static assets.
 *
 *   npm run sitemap                  # default → dist/
 *   OUT_DIR=public node ...          # for Pages deploy
 *
 * Run after `astro build`.
 */
import { readdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = process.env.PROJECT_ROOT ?? process.cwd();
const WALK_DIRS = (process.env.WALK_DIRS ?? join(ROOT, 'dist'))
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const OUT_DIR = process.env.OUT_DIR ?? WALK_DIRS[0];
const SITE = process.env.SITE_URL ?? 'https://brf2.pages.dev';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.html')) out.push(p);
  }
  return out;
}

function findRoot(absPath) {
  return WALK_DIRS.find(d => absPath === d || absPath.startsWith(d + sep)) ?? WALK_DIRS[0];
}

function toUrl(absPath) {
  const root = findRoot(absPath);
  const rel = relative(root, absPath).split(sep).join('/');
  if (rel === 'index.html') return SITE + '/';
  if (rel.endsWith('/index.html')) return SITE + '/' + rel.replace(/\/index\.html$/, '/');
  return SITE + '/' + rel.replace(/\.html$/, '');
}

function lastmod(absPath) {
  return new Date(statSync(findRoot(absPath)).mtime).toISOString().slice(0, 10);
}

const all = WALK_DIRS.flatMap(d => walk(d)).map(p => ({ url: toUrl(p), mtime: lastmod(p) }));

const staticPages = all.filter(u => {
  const p = new URL(u.url).pathname;
  if (/^\/api\//.test(p)) return false;
  if (/^\/(sitemap|rss|robots)\b/.test(p)) return false;
  return /^\/[a-z]/.test(p);
});

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const chunks = chunk(staticPages, 1000);

const urls = chunks.map((c, i) => `  <sitemap>
    <loc>${SITE}/sitemap-${i + 1}.xml</loc>
  </sitemap>`).join('\n');

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</sitemapindex>
`;

writeFileSync(join(OUT_DIR, 'sitemap-index.xml'), indexXml);

chunks.forEach((c, i) => {
  const body = c.map(u => `  <url>
    <loc>${u.url}</loc>
    <lastmod>${u.mtime}</lastmod>
  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  writeFileSync(join(OUT_DIR, `sitemap-${i + 1}.xml`), xml);
});

const articles = [];
for await (const f of glob('src/content/journal/**/*.json', { cwd: ROOT })) {
  const j = JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
  if (!j.datePublished) continue;
  const slug = f.replace(/^src\/content\/journal\//, '').replace(/\.json$/, '');
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

writeFileSync(join(OUT_DIR, 'rss.xml'), rss);

console.log(`Wrote sitemap-index.xml + ${chunks.length} sitemap-N.xml, rss.xml (${top.length} items)`);