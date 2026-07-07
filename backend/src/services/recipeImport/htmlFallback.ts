import * as cheerio from 'cheerio';
import { RecipeStep } from '../../types/RecipeDto';
import { ImportedRecipe, domainOfUrl } from './types';

/**
 * Last-resort DOM extraction, used only when a page exposes no Schema.org
 * data at all. Heuristics are deliberately generic (og: metadata + common
 * class names); site-specific selectors do not belong here — pages that need
 * them should be surfaced by the structured-data miss log instead.
 */

const INGREDIENT_HINT = /ingr[ée]dient/i;
const INSTRUCTION_HINT = /instruction|preparation|pr[ée]paration|etape|[ée]tape|step|method/i;

function hasHint($el: cheerio.Cheerio<any>, hint: RegExp): boolean {
  const attrs = `${$el.attr('class') ?? ''} ${$el.attr('id') ?? ''} ${$el.attr('itemprop') ?? ''}`;
  return hint.test(attrs);
}

/** Collects the text of list items under containers matching a hint. */
function collectListTexts($: cheerio.CheerioAPI, hint: RegExp): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  $('ul, ol').each((_, listEl) => {
    const $list = $(listEl);
    const matches =
      hasHint($list, hint) ||
      $list.parents().toArray().some((parent) => hasHint($(parent), hint));
    if (!matches) return;

    $list.children('li').each((_, li) => {
      const text = $(li).text().replace(/\s+/g, ' ').trim();
      if (text && text.length < 500 && !seen.has(text)) {
        seen.add(text);
        results.push(text);
      }
    });
  });

  return results;
}

export function extractRecipeFromDom(html: string, sourceUrl: string): ImportedRecipe | null {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().replace(/\s+/g, ' ').trim() ||
    $('title').first().text().replace(/\s+/g, ' ').trim() ||
    '';

  const description =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    null;

  let imageUrl = $('meta[property="og:image"]').attr('content')?.trim() || null;
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, sourceUrl || undefined).href;
    } catch {
      imageUrl = null;
    }
  }

  const rawIngredients = collectListTexts($, INGREDIENT_HINT);

  let steps: RecipeStep[] = collectListTexts($, INSTRUCTION_HINT).map((text) => ({
    text,
    duration: null,
  }));
  if (steps.length === 0) {
    // Some sites publish steps as paragraphs inside an instructions container.
    const texts: string[] = [];
    $('p').each((_, p) => {
      const $p = $(p);
      const inInstructions = $p
        .parents()
        .toArray()
        .some((parent) => hasHint($(parent), INSTRUCTION_HINT));
      if (!inInstructions) return;
      const text = $p.text().replace(/\s+/g, ' ').trim();
      if (text && text.length > 10) texts.push(text);
    });
    steps = texts.map((text) => ({ text, duration: null }));
  }

  // A fallback result is only useful if it can seed a review screen: require
  // a title plus at least one substantive block.
  if (!title || (rawIngredients.length === 0 && steps.length === 0)) {
    return null;
  }

  return {
    title,
    description,
    rawIngredients,
    steps,
    prepMin: null,
    cookMin: null,
    totalMin: null,
    servings: null,
    imageUrl,
    categories: [],
    cuisines: [],
    keywords: [],
    rating: null,
    ratingCount: null,
    nutrition: null,
    sourceUrl,
    sourceDomain: domainOfUrl(sourceUrl),
    extractionMethod: 'html-fallback',
  };
}
