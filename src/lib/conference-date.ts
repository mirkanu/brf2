/**
 * Conference date helpers used by the conference page (and inherited by
 * listings cards, RSS, etc.). The shape of `dates` in legacy conferences
 * is non-uniform, so we normalise to one ISO start date for sorting / OG.
 *
 * Supported `dates` strings (so far, observed in the corpus):
 *   "1-8Aug"
 *   "3-10 August"
 *   "27-30 July"
 *   "31 Jul-7 Aug"
 *   "August 3-10"
 *   "TBD"
 */
const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function thisYearIsUpcoming(iso: string): boolean {
  const today = new Date();
  const confDate = new Date(iso);
  return Number.isFinite(confDate.getTime()) && confDate.getTime() >= today.getTime();
}

/**
 * Returns the start of the conference window as an ISO date (YYYY-MM-DD)
 * plus the raw input. `year` is the conventional start year for that
 * conference entry. Reasonable fallback if nothing parses: 1 January
 * (so the entry still sorts).
 */
export function parseConferenceDates(
  raw: string | null | undefined,
  year: number
): { start: string; raw: string } {
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "tbd") {
    return { start: toIso(year, 1, 1), raw: raw ?? "" };
  }
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  // Pattern A: "<day>-<dayOrMonth>[ <month>]" e.g. "1-8Aug", "3-10 August"
  // Pattern B: "<day> <month>-<day> <month>" e.g. "31 Jul-7 Aug"
  // Pattern C: "<month> <day>-<day>" e.g. "August 3-10"
  let day = 1, month = 1;
  // Pattern A
  let m = s.match(/(\d+)\s*-\s*(\d+)?\s*([a-z]+)/);
  if (m) {
    day = parseInt(m[1], 10);
    month = MONTHS[m[3]] ?? 1;
  } else {
    // Pattern B
    m = s.match(/(\d+)\s+([a-z]+)\s*-\s*(\d+)\s+([a-z]+)/);
    if (m) {
      day = parseInt(m[1], 10);
      month = MONTHS[m[2]] ?? 1;
    } else {
      // Pattern C
      m = s.match(/([a-z]+)\s+(\d+)\s*-\s*(\d+)/);
      if (m) {
        month = MONTHS[m[1]] ?? 1;
        day = parseInt(m[2], 10);
      }
    }
  }
  return { start: toIso(year, month, day), raw };
}

export function isUpcoming(d: {
  year: number;
  dates?: string | null;
}): boolean {
  if (d.year > new Date().getFullYear()) return true;
  if (d.year < new Date().getFullYear()) return false;
  // Same year: compare the parsed start date to today.
  const { start } = parseConferenceDates(d.dates ?? "", d.year);
  return thisYearIsUpcoming(start);
}
