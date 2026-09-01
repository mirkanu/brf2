/**
 * Helpers for the new journal-issue routing model:
 *   /journal/                          -> issues index
 *   /journal/issue/issue-NN/                 -> single issue page (zero-padded NN)
 *   /journal/issue/issue-NN/[article-slug]/  -> article page (slug = file slug minus "article-" prefix)
 *
 * Articles in the `journal` collection carry `issueNumber`. The URL embeds the issue
 * so each article is unique even when an article's filename collides across issues.
 */

import { getCollection } from 'astro:content';

/** Zero-pad an issue number to 2 digits (matches `/journal/issue/issue-NN/`). */
export function issuePad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Strip the `article-` prefix from a journal filename slug. */
export function articleSlugFromFilename(filename: string): string {
  return filename.replace(/^article-/, '');
}

/** Issue URL: `/journal/issue/issue-NN/`. */
export function issueHref(issueNumber: number): string {
  return `/journal/issue/issue-${issuePad(issueNumber)}/`;
}

/** Article URL: `/journal/issue/issue-NN/[slug]/`. */
export function articleHref(issueNumber: number, filename: string): string {
  return `${issueHref(issueNumber)}${articleSlugFromFilename(filename)}/`;
}

/** All issue numbers sorted ascending. */
export async function allIssueNumbers(): Promise<number[]> {
  const issues = await getCollection('journalIssues');
  return issues.map((e) => e.data.issueNumber).sort((a, b) => a - b);
}

/**
 * Build an index of articles grouped by issueNumber, sorted newest-first per issue.
 * Articles with null `issueNumber` are excluded — those 32 entries don't belong to a known issue
 * and will surface separately via the legacy routes for now.
 */
export async function articlesByIssue(): Promise<Map<number, { issue: any; articles: any[] }>> {
  const [issues, articles] = await Promise.all([
    getCollection('journalIssues'),
    getCollection('journal'),
  ]);

  const issueByNumber = new Map<number, any>();
  for (const issue of issues) issueByNumber.set(issue.data.issueNumber, issue);

  const grouped = new Map<number, { issue: any; articles: any[] }>();
  for (const article of articles) {
    if (article.data.section !== 'journal-article') continue;
    const n = article.data.issueNumber;
    if (n == null) continue;
    const issue = issueByNumber.get(n);
    if (!issue) continue;
    if (!grouped.has(n)) grouped.set(n, { issue, articles: [] });
    grouped.get(n)!.articles.push(article);
  }
  for (const { articles } of grouped.values()) {
    articles.sort((a, b) => +new Date(b.data.datePublished) - +new Date(a.data.datePublished));
  }
  return grouped;
}