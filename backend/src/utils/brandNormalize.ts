/**
 * Normalizes a brand name for deduplication: lowercase, accent-stripped,
 * and reduced to [a-z0-9] only.
 * "Grand Frais", "grand frais", "GrandFrais" -> "grandfrais".
 */
export function normalizeBrandName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Builds a URL-safe kebab slug candidate from a brand name.
 * "Carrefour City" -> "carrefour-city". Used as the brands.id seed for
 * custom brands (collisions are resolved by the service with a numeric suffix).
 */
export function slugifyBrandName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'brand';
}
