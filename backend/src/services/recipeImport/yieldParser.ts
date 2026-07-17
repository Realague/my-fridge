/**
 * Schema.org `recipeYield` parsing. The field is published as a number
 * ("4"), free text ("4 personnes", "Pour 6 à 8 parts"), or an array mixing
 * both. We extract the first plausible integer and return null otherwise —
 * never throw, never guess beyond the text.
 */

const MAX_REASONABLE_SERVINGS = 200;

function fromString(text: string): number | null {
  const match = text.match(/\d+/);
  if (!match) return null;
  const value = parseInt(match[0], 10);
  if (!Number.isFinite(value) || value < 1 || value > MAX_REASONABLE_SERVINGS) {
    return null;
  }
  return value;
}

export function parseRecipeYield(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 1 && value <= MAX_REASONABLE_SERVINGS
      ? Math.round(value)
      : null;
  }
  if (typeof value === 'string') {
    return fromString(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseRecipeYield(entry);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  // QuantitativeValue objects ({ "@type": "QuantitativeValue", value: 4 }).
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return parseRecipeYield((value as Record<string, unknown>).value);
  }
  return null;
}
