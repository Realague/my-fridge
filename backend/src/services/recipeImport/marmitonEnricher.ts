import * as cheerio from 'cheerio';
import { RecipeDifficulty } from '../../models/Recipe';

/**
 * Marmiton-specific DOM enrichments. These complement — never replace — the
 * Schema.org data: difficulty is not published in Marmiton's JSON-LD, and
 * the ingredient↔step relationship can only be inferred from the page's
 * ingredient images. Both are best-effort; when selectors break we simply
 * return less data.
 */

export interface MarmitonEnrichment {
  difficulty: RecipeDifficulty | null;
  ingredientStepMapping: { [ingredientIndex: number]: number[] };
}

export function isMarmitonDomain(domain: string): boolean {
  return domain === 'marmiton.org' || domain.endsWith('.marmiton.org');
}

function mapDifficulty(difficulty: string | undefined): RecipeDifficulty | null {
  if (!difficulty) return null;
  const lower = difficulty.toLowerCase();
  if (lower.includes('facile')) return 'Easy'; // covers "très facile" too
  if (lower.includes('difficile')) return 'Hard';
  if (lower.includes('moyen')) return 'Medium';
  return null;
}

function extractImageId(url: string): string | null {
  if (!url) return null;
  // Typical Marmiton resize URLs: .../12345_w600h400...
  const wMatch = url.match(/\/(\d+)_w\d+/);
  if (wMatch?.[1]) return wMatch[1];
  // Fallback: long numeric id in path before extension
  const fileMatch = url.match(/\/(\d{4,})\.(?:jpe?g|png|webp)(?:\?|$)/i);
  if (fileMatch?.[1]) return fileMatch[1];
  return null;
}

function imgDataOrSrc($img: cheerio.Cheerio<any>): string | undefined {
  return $img.attr('data-src') || $img.attr('src') || undefined;
}

export function enrichFromMarmitonDom(html: string, ingredients: string[]): MarmitonEnrichment {
  const $ = cheerio.load(html);

  // Difficulty from the page (not in JSON-LD typically)
  let difficultyText: string | undefined;
  $('.recipe-primary__tags, .mrtn-recipe-info').each((_, element) => {
    const text = $(element).text().toLowerCase();
    if (text.includes('très facile')) {
      difficultyText = 'très facile';
    } else if (text.includes('facile')) {
      difficultyText = 'facile';
    } else if (text.includes('moyen')) {
      difficultyText = 'moyen';
    } else if (text.includes('difficile')) {
      difficultyText = 'difficile';
    }
  });

  // Build step-ingredient mapping from DOM ingredient images.
  // Each .card-ingredient has a data-name and an image with a unique ID.
  // Steps (.recipe-step-list__container) show the same images to indicate
  // which ingredients are used; matching by image ID lets us pre-fill
  // the usedInSteps relationship.
  //
  // Map each image ID to a JSON-LD ingredient index. We must not collapse
  // by ingredient name: duplicate names (e.g. two "tomates" lines) need
  // distinct indices, so we assign lines greedily in card DOM order (first
  // unused ingredient line whose text includes data-name).
  const lowerIngredients = ingredients.map(t => t.toLowerCase());
  const usedIngredientIndices = new Set<number>();
  const imageIdToJsonIndex = new Map<string, number>();

  $('.card-ingredient').each((_, el) => {
    const name = $(el).attr('data-name')?.trim().toLowerCase();
    if (!name) return;
    const $img = $(el).find('.card-ingredient-image img').first();
    const imgSrc = imgDataOrSrc($img);
    if (!imgSrc) return;
    const imgId = extractImageId(imgSrc);
    if (!imgId) return;

    let idx = lowerIngredients.findIndex(
      (text, i) => !usedIngredientIndices.has(i) && text.includes(name)
    );
    if (idx === -1) {
      const parts = name.split(/\s+/).filter(Boolean);
      const token = parts.find(p => p.length >= 3) ?? parts[0];
      if (token && token.length >= 3) {
        idx = lowerIngredients.findIndex(
          (text, i) => !usedIngredientIndices.has(i) && text.includes(token)
        );
      }
    }
    if (idx === -1) return;

    usedIngredientIndices.add(idx);
    imageIdToJsonIndex.set(imgId, idx);
  });

  const ingredientStepMapping: { [ingredientIndex: number]: number[] } = {};
  $('.recipe-step-list__container').each((stepIndex, el) => {
    $(el).find('.recipe-step-list__head img').each((_, img) => {
      const src = imgDataOrSrc($(img));
      if (!src) return;
      const imgId = extractImageId(src);
      if (!imgId) return;
      const ingIndex = imageIdToJsonIndex.get(imgId);
      if (ingIndex === undefined) return;
      if (!ingredientStepMapping[ingIndex]) {
        ingredientStepMapping[ingIndex] = [];
      }
      if (!ingredientStepMapping[ingIndex].includes(stepIndex)) {
        ingredientStepMapping[ingIndex].push(stepIndex);
      }
    });
  });

  return {
    difficulty: mapDifficulty(difficultyText),
    ingredientStepMapping,
  };
}
