#!/usr/bin/env node
/**
 * Generate dist/sitemap-*.xml + dist/rss.xml from the built site.
 * Run AFTER `npm run build`. Writes to dist/ so the deploy picks them up.
 *
 *   node scratch/phase-2/gen-sitemaps.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { glob } from 'node:fs/promises';

const ROOT = '/home/workspace/1 Projects/brf2';
const DIST = join(ROOT, 'dist');
const SITE = 'https://brf2.pages.dev';

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

function toUrl(absPath) {
  const rel = relative(DIST, absPath).split(sep).join('/');
  if (rel === 'index.html') return SITE + '/';
  if (rel.endsWith('/index.html')) return SITE + '/' + rel.replace(/\/index\.html$/, '/');
  return SITE + '/' + rel.replace(/\.html$/, '');
}

function lastmod(absPath) {
  return new Date(statSync(absPath).mtime).toISOString().slice(0, 10);
}

const all = walk(DIST).map(p => ({ url: toUrl(p), mtime: lastmod(p) }));

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

const urls = chunks.map((c, i) => `  <sitemap>\n    <loc>${SITE}/sitemap-${i + 1}.xml</loc>\n  </sitemap>`).join('\n');

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</sitemapindex>
`;

writeFileSync(join(DIST, 'sitemap-index.xml'), indexXml);

chunks.forEach((c, i) => {
  const body = c.map(u => `  <url>\n    <loc>${u.url}</loc>\n    <lastmod>${u.mtime}</lastmod>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  writeFileSync(join(DIST, `sitemap-${i + 1}.xml`), xml);
});

// RSS — most recent 50 journal articles.
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

const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rssItems = top.map(a => `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(a.link)}</link>
      <description>${esc(a.description)}</description>
      <pubDate>${a.pubDate}</pubDate>
      ${a.authors ? `<dc:creator>${esc(a.authors)}</dc:creator>` : ''}
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

writeFileSync(join(DIST, 'rss.xml'), rss);

console.log(`Wrote sitemap-index.xml + ${chunks.length} sitemap-N.xml, rss.xml (${top.length} items)`);
