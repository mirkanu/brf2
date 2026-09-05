/**
 * Decode common HTML entities that appear in legacy data.
 * Used wherever content-collection titles are rendered, so that titles
 * like "Marriage & Family" stored as "Marriage &amp; Family" render correctly.
 *
 * Kept narrow on purpose: only the entities that actually appear in
 * legacyPath / scrape data. Add to this map as new ones are discovered.
 */
export function decodeEntities(input: string): string {
  if (!input) return input;
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
