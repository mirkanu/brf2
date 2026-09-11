/**
 * Speaker helpers shared by the conference template and the author route.
 *
 * Slugs are lowercase-hyphenated display names. The author route already builds
 * these from BRJ authors; conference speakers may include people not yet in BRJ,
 * so the same slugging rules are used and the two name spaces collide
 * harmlessly (each route renders whatever matches).
 */
export function speakerSlug(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/([a-z])([A-Z])/g, '$1 $2') // AngusStewart -> Angus Stewart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function authorSlug(name: string): string {
  // Same algorithm today; kept as a separate name so a future divergence
  // (e.g. stripping honorifics for authors only) doesn't affect conference pages.
  return speakerSlug(name);
}

/** True if the speaker is a placeholder / not yet announced. */
export function isTbdSpeaker(name: string): boolean {
  return name.trim().toUpperCase() === 'TBD';
}
