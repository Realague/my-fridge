import * as cheerio from 'cheerio';
import { ExtractionMethod } from './types';

/**
 * Locates the Schema.org Recipe node in a page, trying the formats in order
 * of reliability: JSON-LD first, then microdata, then RDFa. Returns the raw
 * node (JSON-LD-shaped object) plus the method used, or null when the page
 * exposes no structured recipe at all (the caller then decides whether to
 * fall back to DOM heuristics).
 */
export interface StructuredRecipeNode {
  node: Record<string, unknown>;
  method: ExtractionMethod;
}

const MAX_WALK_DEPTH = 6;

/** True when a JSON-LD `@type` value (string or array) designates a Recipe. */
export function isRecipeType(type: unknown): boolean {
  const matches = (value: unknown): boolean =>
    typeof value === 'string' && /(^|[/:#])recipe$/i.test(value.trim());
  if (Array.isArray(type)) return type.some(matches);
  return matches(type);
}

/**
 * Recursively collects every object whose @type is Recipe. Handles top-level
 * arrays, `@graph` containers, and recipes nested inside other entities
 * (e.g. a WebPage whose `mainEntity` is the Recipe).
 */
function collectRecipeNodes(
  value: unknown,
  depth: number,
  out: Record<string, unknown>[]
): void {
  if (depth > MAX_WALK_DEPTH || value === null || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const entry of value) collectRecipeNodes(entry, depth + 1, out);
    return;
  }

  const obj = value as Record<string, unknown>;
  if (isRecipeType(obj['@type'])) {
    out.push(obj);
    return;
  }

  // Walk known containers plus every object-valued property. `@graph` and
  // `mainEntity` are the common cases; the generic walk covers the rest.
  for (const key of Object.keys(obj)) {
    const child = obj[key];
    if (child && typeof child === 'object') {
      collectRecipeNodes(child, depth + 1, out);
    }
  }
}

/**
 * Scores a candidate node so that, when a page embeds several Recipe objects
 * (e.g. the main recipe plus "you may also like" cards), the richest one wins.
 */
function scoreRecipeNode(node: Record<string, unknown>): number {
  let score = 0;
  if (node.name) score += 2;
  if (Array.isArray(node.recipeIngredient) && node.recipeIngredient.length > 0) score += 4;
  if (node.recipeInstructions) score += 4;
  if (node.prepTime || node.cookTime || node.totalTime) score += 1;
  if (node.image) score += 1;
  return score;
}

function extractFromJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const candidates: Record<string, unknown>[] = [];

  $('script[type^="application/ld+json"]').each((_, element) => {
    const rawJson = $(element).contents().text();
    if (!rawJson || !rawJson.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      // Some sites ship JSON with raw control characters (unescaped newlines
      // inside strings). Retry once with them stripped before giving up on
      // this block — other blocks may still parse fine.
      try {
        parsed = JSON.parse(rawJson.replace(/[\u0000-\u001f]/g, ' '));
      } catch {
        return;
      }
    }
    collectRecipeNodes(parsed, 0, candidates);
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => scoreRecipeNode(b) - scoreRecipeNode(a));
  return candidates[0] ?? null;
}

/** Reads the value of a microdata itemprop element. */
function microdataValue($: cheerio.CheerioAPI, element: any): string {
  const $el = $(element);
  const tag = (element?.tagName as string | undefined)?.toLowerCase() ?? '';
  if (tag === 'meta') return $el.attr('content')?.trim() ?? '';
  if (tag === 'img') return ($el.attr('src') ?? $el.attr('data-src'))?.trim() ?? '';
  if (tag === 'a' || tag === 'link') return $el.attr('href')?.trim() ?? '';
  if (tag === 'time') return ($el.attr('datetime') ?? $el.text()).trim();
  const content = $el.attr('content');
  if (content) return content.trim();
  return $el.text().replace(/\s+/g, ' ').trim();
}

/**
 * Rebuilds a JSON-LD-shaped node from microdata markup
 * (`itemscope itemtype="https://schema.org/Recipe"`), so the same mapper
 * handles both formats.
 */
function extractFromMicrodata($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scope = $('[itemscope][itemtype]')
    .filter((_, el) => /schema\.org\/+recipe$/i.test($(el).attr('itemtype') ?? ''))
    .first();
  if (scope.length === 0) return null;

  const node: Record<string, unknown> = { '@type': 'Recipe' };
  const push = (key: string, value: unknown) => {
    if (value === '' || value === undefined || value === null) return;
    const existing = node[key];
    if (existing === undefined) node[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else node[key] = [existing, value];
  };

  scope.find('[itemprop]').each((_, element) => {
    const $el = $(element);
    const prop = $el.attr('itemprop');
    if (!prop) return;
    // Skip properties belonging to a nested itemscope other than a HowToStep
    // (e.g. aggregateRating/author sub-objects) except the ones we rebuild.
    const parentScope = $el.parents('[itemscope]').first();
    const inNestedScope = parentScope.length > 0 && !parentScope.is(scope);

    switch (prop) {
      case 'name':
        if (!inNestedScope) push('name', microdataValue($, element));
        break;
      case 'description':
        if (!inNestedScope) push('description', microdataValue($, element));
        break;
      case 'recipeIngredient':
      case 'ingredients': // legacy microdata property name
        push('recipeIngredient', microdataValue($, element));
        break;
      case 'recipeInstructions':
        push('recipeInstructions', microdataValue($, element));
        break;
      case 'prepTime':
      case 'cookTime':
      case 'totalTime':
      case 'recipeYield':
      case 'recipeCategory':
      case 'recipeCuisine':
      case 'keywords':
        if (!inNestedScope) push(prop, microdataValue($, element));
        break;
      case 'image':
        push('image', microdataValue($, element));
        break;
      case 'ratingValue':
      case 'reviewCount':
      case 'ratingCount': {
        const rating = (node.aggregateRating ?? {}) as Record<string, unknown>;
        rating[prop] = microdataValue($, element);
        node.aggregateRating = rating;
        break;
      }
      default:
        break;
    }
  });

  if (!node.name && !node.recipeIngredient) return null;
  return node;
}

/**
 * Minimal RDFa support (`typeof="Recipe"` + `property` attributes). Rare in
 * the wild for recipes, but cheap to read since properties mirror microdata.
 */
function extractFromRdfa($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scope = $('[typeof]')
    .filter((_, el) => /(^|[\s/:])recipe$/i.test($(el).attr('typeof') ?? ''))
    .first();
  if (scope.length === 0) return null;

  const node: Record<string, unknown> = { '@type': 'Recipe' };
  const push = (key: string, value: string) => {
    if (!value) return;
    const existing = node[key];
    if (existing === undefined) node[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else node[key] = [existing, value];
  };

  scope.find('[property]').each((_, element) => {
    const $el = $(element);
    const rawProp = $el.attr('property') ?? '';
    // Properties may be prefixed ("schema:recipeIngredient", "v:name").
    const prop = rawProp.split(':').pop() ?? '';
    const value =
      $el.attr('content')?.trim() ??
      ($el.is('img') ? $el.attr('src')?.trim() : undefined) ??
      $el.text().replace(/\s+/g, ' ').trim();
    if (!value) return;

    if (prop === 'ingredients') push('recipeIngredient', value);
    else if (
      [
        'name', 'description', 'recipeIngredient', 'recipeInstructions',
        'prepTime', 'cookTime', 'totalTime', 'recipeYield',
        'recipeCategory', 'recipeCuisine', 'keywords', 'image',
      ].includes(prop)
    ) {
      push(prop, value);
    }
  });

  if (!node.name && !node.recipeIngredient) return null;
  return node;
}

/**
 * Entry point: finds the structured Recipe node in raw HTML.
 * Pure function — no network, no logging — so it is directly testable
 * against saved fixture pages.
 */
export function findStructuredRecipe(html: string): StructuredRecipeNode | null {
  const $ = cheerio.load(html);

  const jsonLd = extractFromJsonLd($);
  if (jsonLd) return { node: jsonLd, method: 'json-ld' };

  const microdata = extractFromMicrodata($);
  if (microdata) return { node: microdata, method: 'microdata' };

  const rdfa = extractFromRdfa($);
  if (rdfa) return { node: rdfa, method: 'rdfa' };

  return null;
}
