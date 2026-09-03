import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

type Item = {
  title: string;
  pubDate: Date;
  link: string;
  description?: string;
  categories?: string[];
};

function pickAuthorSlug(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const first = raw.find((s) => typeof s === "string" && s.trim());
  if (!first) return undefined;
  const cleaned = String(first).trim();
  // entries like "manuelkuhs@gmail.com" -> display name slug
  const base = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
  return base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(context: APIContext) {
  const [journal, conferences, podcasts] = await Promise.all([
    getCollection("journal"),
    getCollection("conferences"),
    getCollection("podcasts"),
  ]);

  const items: Item[] = [];

  for (const entry of journal) {
    if (entry.data.section && entry.data.section !== "journal-article") continue;
    const issue = entry.data.issueNumber ?? "unknown";
    const slug = entry.id.replace(/\.json$/, "");
    const pub = toDate(entry.data.datePublished);
    if (!pub) continue;
    items.push({
      title: entry.data.title,
      link: `/journal/issue/issue-${String(issue).padStart(2, "0")}/${slug}/`,
      pubDate: pub,
      description: `Issue ${issue} — ${(entry.data.rawCategories ?? []).join(", ")}`.trim(),
      categories: [String(issue)],
    });
  }

  for (const entry of conferences) {
    const pub = toDate(entry.data.datePublished);
    if (!pub) continue;
    items.push({
      title: entry.data.title,
      link: `/conferences/${entry.data.year}/`,
      pubDate: pub,
      description: `BRF Conference — ${entry.data.year}`,
      categories: ["conference", String(entry.data.year)],
    });
  }

  for (const entry of podcasts) {
    const pub = toDate(entry.data.datePublished);
    if (!pub) continue;
    items.push({
      title: entry.data.title,
      link: `/podcasts/${entry.id.replace(/\.json$/, "")}/`,
      pubDate: pub,
      description: `Podcast — ${(entry.data.rawCategories ?? []).join(", ")}`.trim(),
      categories: ["podcast"],
    });
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  const top = items.slice(0, 100);

  // attach dc:creator for journal items using the per-author slug helper
  type RssItem = {
    title: string;
    pubDate: Date;
    link: string;
    description?: string;
    categories?: string[];
    author?: string;
  };

  const journalIndex = new Map<string, string | undefined>();
  for (const entry of journal) {
    if (entry.data.section && entry.data.section !== "journal-article") continue;
    const slug = entry.id.replace(/\.json$/, "");
    journalIndex.set(slug, pickAuthorSlug(entry.data.authors));
  }

  const itemsWithAuthor: RssItem[] = top.map((it) => {
    const out: RssItem = {
      title: it.title,
      pubDate: it.pubDate,
      link: it.link,
    };
    if (it.description !== undefined) out.description = it.description;
    if (it.categories !== undefined) out.categories = it.categories;
    const journalSlugMatch = it.link.match(/\/journal\/issue\/issue-\d+\/([^/]+)\//);
    if (journalSlugMatch) {
      const slug = journalSlugMatch[1];
      const authorSlug = journalIndex.get(slug);
      if (authorSlug) out.author = authorSlug;
    }
    return out;
  });

  return rss({
    title: "British Reformed Fellowship",
    description:
      "Articles, conference sessions, and podcasts from the British Reformed Fellowship.",
    site: context.site ?? "https://brf2.pages.dev",
    items: itemsWithAuthor,
    customData: "<language>en-gb</language>",
  });
}
