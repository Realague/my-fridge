// "il y a 2 jours" / "2 days ago" — coarse day/hour/minute granularity, enough
// for the récents indicator. Locale is the i18n base code (fr/en/es).
export function formatRelativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const diffMs = then - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs >= day) return rtf.format(Math.round(diffMs / day), 'day');
  if (abs >= hour) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (abs >= minute) return rtf.format(Math.round(diffMs / minute), 'minute');
  return rtf.format(Math.round(diffMs / 1000), 'second');
}
