// Charter token maps. Single source of truth for badges + status surfaces.
// Resolves to --mf-* CSS variables wired through tailwind.config.ts (`mf.*` palette).
// Charter v3.0 §02 — 4 semantic channels (green/danger/warning/info) + neutral surface.

export type CharterTone = "primary" | "info" | "warning" | "danger" | "neutral";

// Pre-computed class strings per tone — used everywhere a badge/pill needs
// background + text + dark-mode parity. All classes already exist in the tailwind
// build because they are statically referenced here.
const TONE_BADGE: Record<CharterTone, string> = {
  primary: "bg-mf-green-soft text-mf-green-deep",
  info: "bg-mf-info-soft text-mf-info",
  warning: "bg-mf-warning-soft text-mf-warning",
  danger: "bg-mf-danger-soft text-mf-danger",
  neutral: "bg-mf-night-elevated text-mf-text-soft",
};

const TONE_TEXT: Record<CharterTone, string> = {
  primary: "text-mf-green-deep",
  info: "text-mf-info",
  warning: "text-mf-warning",
  danger: "text-mf-danger",
  neutral: "text-mf-text-soft",
};

export function toneBadgeClass(tone: CharterTone): string {
  return TONE_BADGE[tone];
}

export function toneTextClass(tone: CharterTone): string {
  return TONE_TEXT[tone];
}

// Recipe difficulty mapping — Easy/Medium/Hard → charter semantic channels.
export function difficultyTone(difficulty: string | null | undefined): CharterTone {
  switch ((difficulty ?? "").toLowerCase()) {
    case "easy":
      return "primary";
    case "medium":
      return "warning";
    case "hard":
      return "danger";
    default:
      return "neutral";
  }
}

// Item category mapping — groups the 21 categories onto 4 semantic channels so
// the badge surface stays readable without inventing 21 new color tokens.
// Produce/fresh → primary, proteins/wet → info, pantry/dry → warning, non-food → neutral.
const CATEGORY_TONE: Record<string, CharterTone> = {
  vegetables: "primary",
  fruits: "primary",
  bakery: "primary",
  cooked_meal: "primary",
  meal: "primary",
  meat: "info",
  fish: "info",
  seafood: "info",
  dairy: "info",
  beverages: "info",
  grains: "warning",
  spices: "warning",
  condiments: "warning",
  snacks: "warning",
  canned: "warning",
  frozen: "neutral",
  preparation: "neutral",
  cleaning_products: "neutral",
  household: "neutral",
  personal: "neutral",
  other: "neutral",
};

export function categoryTone(category: string | null | undefined): CharterTone {
  return CATEGORY_TONE[(category ?? "").toLowerCase()] ?? "neutral";
}

// Freezer health — share of recommended freezer time used.
// <70% → info (still good), 70-90% → warning (use soon), >90% → danger (use now).
export function freezerTone(daysFrozen: number, recommendedDays: number): CharterTone {
  const total = recommendedDays > 0 ? recommendedDays : 180;
  const ratio = daysFrozen / total;
  if (ratio > 0.9) return "danger";
  if (ratio >= 0.7) return "warning";
  return "info";
}

// Recipe ingredient match confidence — ≥0.8 strong, ≥0.5 fuzzy, otherwise weak.
export function confidenceTone(confidence: number): CharterTone {
  if (confidence >= 0.8) return "primary";
  if (confidence >= 0.5) return "warning";
  return "danger";
}
