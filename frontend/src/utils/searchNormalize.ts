/**
 * Range covers Unicode "Combining Diacritical Marks" (U+0300..U+036F).
 * Built via RegExp constructor with explicit escape codes so the regex is
 * encoding-safe regardless of how the source file is stored.
 */
const COMBINING_DIACRITICAL_MARKS = new RegExp('[̀-ͯ]', 'g');

/**
 * Lowercase + strip diacritics so accents and casing don't affect search matches.
 * "Parmesan" / "parmesan" / "Parmésan" all normalize to "parmesan".
 */
export function normalizeForSearch(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICAL_MARKS, '');
}
