/**
 * ISO 8601 duration parsing for Schema.org time fields (prepTime, cookTime,
 * totalTime, performTime). Sites publish values like "PT35M", "PT1H30M",
 * sometimes with seconds ("PT90S"), days ("P1DT2H") or decimal parts.
 * Parsing is lenient (case-insensitive, trims whitespace) but returns null
 * for anything that is not a valid duration — callers decide the default.
 */

const DURATION_REGEX =
  /^P(?:(\d+(?:[.,]\d+)?)W)?(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i;

function toNumber(part: string | undefined): number {
  if (!part) return 0;
  return parseFloat(part.replace(',', '.'));
}

/** Parses an ISO 8601 duration into total seconds, or null when invalid/empty. */
export function parseIso8601DurationToSeconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(DURATION_REGEX);
  if (!match) return null;

  const [, weeks, days, hours, minutes, seconds] = match;
  // "P" or "PT" alone technically matches the regex but carries no components.
  if (!weeks && !days && !hours && !minutes && !seconds) return null;

  const total =
    toNumber(weeks) * 7 * 24 * 3600 +
    toNumber(days) * 24 * 3600 +
    toNumber(hours) * 3600 +
    toNumber(minutes) * 60 +
    toNumber(seconds);

  return Number.isFinite(total) ? Math.round(total) : null;
}

/** Parses an ISO 8601 duration into whole minutes, or null when invalid/empty. */
export function parseIso8601DurationToMinutes(value: unknown): number | null {
  const seconds = parseIso8601DurationToSeconds(value);
  if (seconds === null) return null;
  return Math.round(seconds / 60);
}
