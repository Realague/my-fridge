import * as cheerio from 'cheerio';
import { RecipeStep } from '../../types/RecipeDto';
import { parseIso8601DurationToMinutes, parseIso8601DurationToSeconds } from './iso8601';
import { parseRecipeYield } from './yieldParser';
import { ExtractionMethod, ImportedRecipe, domainOfUrl } from './types';

/**
 * Maps a raw Schema.org Recipe node (from JSON-LD, microdata or RDFa) to the
 * internal `ImportedRecipe`. Every field is defensive: absent or malformed
 * optional data must never throw, it just yields null/empty.
 */

/** Decodes HTML entities and strips any markup from a text field. */
function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = /[<&]/.test(value) ? cheerio.load(value).root().text() : value;
  return text.replace(/\s+/g, ' ').trim();
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** "kw1, kw2" | ["kw1", "kw2"] → ["kw1", "kw2"] */
function toStringList(value: unknown): string[] {
  const out: string[] = [];
  for (const entry of asArray(value)) {
    if (typeof entry === 'string') {
      for (const part of entry.split(',')) {
        const cleaned = cleanText(part);
        if (cleaned) out.push(cleaned);
      }
    } else if (entry && typeof entry === 'object') {
      const name = cleanText((entry as Record<string, unknown>).name);
      if (name) out.push(name);
    }
  }
  return [...new Set(out)];
}

/** recipeIngredient entries: strings, or objects carrying a text/name field. */
function extractRawIngredients(node: Record<string, unknown>): string[] {
  const source = node.recipeIngredient ?? (node as Record<string, unknown>).ingredients;
  const out: string[] = [];
  for (const entry of asArray(source)) {
    if (typeof entry === 'string') {
      const cleaned = cleanText(entry);
      if (cleaned) out.push(cleaned);
    } else if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      const cleaned = cleanText(obj.text ?? obj.name);
      if (cleaned) out.push(cleaned);
    }
  }
  return out;
}

/**
 * Splits a single instruction blob into steps. Sites that publish
 * recipeInstructions as one string usually separate steps with newlines or
 * numbered prefixes ("1. Faire revenir…").
 */
function splitInstructionBlob(blob: string): string[] {
  const normalized = blob.replace(/\r/g, '\n');
  let parts = normalized.split(/\n+/);
  if (parts.length === 1) {
    // No newlines: try numbered prefixes, keeping the text after the number.
    const byNumbers = normalized.split(/(?:^|\s)(?:\d{1,2})[.)]\s+/).filter(Boolean);
    if (byNumbers.length > 1) parts = byNumbers;
  }
  return parts.map((part) => cleanText(part)).filter((part) => part.length > 0);
}

/**
 * Normalizes the three published forms of `recipeInstructions`:
 *  1. a single string (possibly with embedded newlines / numbering);
 *  2. an array of HowToStep objects (or plain strings);
 *  3. HowToSection objects grouping steps under `itemListElement`.
 * Sections and steps can be nested and mixed; everything is flattened into
 * an ordered list of step texts with optional per-step durations (seconds).
 */
export function normalizeInstructions(value: unknown, depth = 0): RecipeStep[] {
  if (depth > 4 || value === undefined || value === null) return [];

  if (typeof value === 'string') {
    return splitInstructionBlob(value).map((text) => ({ text, duration: null }));
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeInstructions(entry, depth + 1));
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // HowToSection (or ItemList): recurse into its elements.
    if (obj.itemListElement !== undefined) {
      return normalizeInstructions(obj.itemListElement, depth + 1);
    }
    const text = cleanText(obj.text ?? obj.name);
    if (!text) return [];
    const duration =
      parseIso8601DurationToSeconds(obj.performTime) ??
      parseIso8601DurationToSeconds(obj.totalTime);
    return [{ text, duration }];
  }

  return [];
}

/** image: string | string[] | ImageObject | ImageObject[] → first usable URL. */
export function extractImageUrl(value: unknown, baseUrl: string): string | null {
  for (const entry of asArray(value)) {
    let candidate: string | null = null;
    if (typeof entry === 'string') {
      candidate = entry.trim();
    } else if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      const url = obj.url ?? obj.contentUrl;
      if (typeof url === 'string') candidate = url.trim();
    }
    if (!candidate) continue;
    try {
      return new URL(candidate, baseUrl || undefined).href;
    } catch {
      continue;
    }
  }
  return null;
}

function extractRating(node: Record<string, unknown>): { rating: number | null; ratingCount: number | null } {
  const aggregate = node.aggregateRating;
  if (!aggregate || typeof aggregate !== 'object' || Array.isArray(aggregate)) {
    return { rating: null, ratingCount: null };
  }
  const obj = aggregate as Record<string, unknown>;
  const ratingValue = parseFloat(String(obj.ratingValue ?? ''));
  const countValue = parseInt(String(obj.reviewCount ?? obj.ratingCount ?? ''), 10);
  return {
    rating: Number.isFinite(ratingValue) ? ratingValue : null,
    ratingCount: Number.isFinite(countValue) ? countValue : null,
  };
}

/** Keeps nutrition as a flat string map, dropping JSON-LD structural noise. */
function extractNutrition(node: Record<string, unknown>): Record<string, string> | null {
  const nutrition = node.nutrition;
  if (!nutrition || typeof nutrition !== 'object' || Array.isArray(nutrition)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(nutrition as Record<string, unknown>)) {
    if (key.startsWith('@')) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const cleaned = cleanText(String(value));
      if (cleaned) out[key] = cleaned;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function mapSchemaOrgRecipe(
  node: Record<string, unknown>,
  sourceUrl: string,
  method: ExtractionMethod
): ImportedRecipe {
  const prepMin = parseIso8601DurationToMinutes(node.prepTime);
  const cookMin = parseIso8601DurationToMinutes(node.cookTime);
  const totalMin = parseIso8601DurationToMinutes(node.totalTime);
  const { rating, ratingCount } = extractRating(node);

  return {
    title: cleanText(node.name),
    description: cleanText(node.description) || null,
    rawIngredients: extractRawIngredients(node),
    steps: normalizeInstructions(node.recipeInstructions),
    prepMin,
    cookMin,
    totalMin: totalMin ?? (prepMin !== null || cookMin !== null ? (prepMin ?? 0) + (cookMin ?? 0) : null),
    servings: parseRecipeYield(node.recipeYield ?? (node as Record<string, unknown>).yield),
    imageUrl: extractImageUrl(node.image, sourceUrl),
    categories: toStringList(node.recipeCategory),
    cuisines: toStringList(node.recipeCuisine),
    keywords: toStringList(node.keywords),
    rating,
    ratingCount,
    nutrition: extractNutrition(node),
    sourceUrl,
    sourceDomain: domainOfUrl(sourceUrl),
    extractionMethod: method,
  };
}
