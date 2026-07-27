// Chart colors for the statistics screens. Everything resolves to charter
// tokens (--mf-*) so light/dark parity comes for free — no raw hex here.

/**
 * Per-category hue for the "ce que tu jettes le plus" bars. Categories absent
 * from the map fall back to the rotating palette below, so a new ItemCategory
 * never renders colorless.
 */
const CATEGORY_COLOR: Record<string, string> = {
  vegetables: 'var(--mf-green)',
  fruits: 'var(--mf-yellow)',
  dairy: 'var(--mf-info)',
  meat: 'var(--mf-danger)',
  fish: 'var(--mf-blue)',
  seafood: 'var(--mf-blue)',
  grains: 'var(--mf-brown)',
  bakery: 'var(--mf-brown)',
  snacks: 'var(--mf-orange)',
  beverages: 'var(--mf-purple)',
  condiments: 'var(--mf-warning)',
  spices: 'var(--mf-warning)',
  canned: 'var(--mf-text-soft)',
  frozen: 'var(--mf-info)',
  meal: 'var(--mf-green-deep)',
  cooked_meal: 'var(--mf-green-deep)',
  preparation: 'var(--mf-purple)',
  cleaning_products: 'var(--mf-text-mute)',
  other: 'var(--mf-text-mute)',
};

const FALLBACK_PALETTE = [
  'var(--mf-green)',
  'var(--mf-info)',
  'var(--mf-orange)',
  'var(--mf-purple)',
  'var(--mf-brown)',
];

export function categoryColor(category: string, index = 0): string {
  return CATEGORY_COLOR[category] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

/**
 * One hue per household member, assigned by position in the (stable,
 * alphabetical) member list. Deliberately unranked — the order carries no
 * meaning beyond keeping colors steady between renders.
 */
const MEMBER_PALETTE = [
  'var(--mf-green)',
  'var(--mf-purple)',
  'var(--mf-blue)',
  'var(--mf-pink)',
  'var(--mf-orange)',
  'var(--mf-brown)',
];

export function memberColor(index: number): string {
  return MEMBER_PALETTE[index % MEMBER_PALETTE.length];
}
