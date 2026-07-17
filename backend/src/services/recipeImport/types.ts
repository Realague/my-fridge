import { RecipeStep } from '../../types/RecipeDto';
import { MatchedIngredient } from '../IngredientMatchingService';
import { RecipeDifficulty } from '../../models/Recipe';

/** How the recipe data was obtained from the page. */
export type ExtractionMethod = 'json-ld' | 'microdata' | 'rdfa' | 'html-fallback';

/**
 * Normalized, source-agnostic recipe produced by the extraction pipeline.
 * All fields except `sourceUrl`/`sourceDomain` are best-effort: extraction
 * must never throw because an optional Schema.org field is missing.
 */
export interface ImportedRecipe {
  title: string;
  description: string | null;
  /** Raw ingredient lines exactly as published (before normalization). */
  rawIngredients: string[];
  /** Flattened instruction steps (all recipeInstructions forms normalized). */
  steps: RecipeStep[];
  prepMin: number | null;
  cookMin: number | null;
  totalMin: number | null;
  servings: number | null;
  imageUrl: string | null;
  categories: string[];
  cuisines: string[];
  /** Schema.org keywords, normalized to a list. */
  keywords: string[];
  rating: number | null;
  ratingCount: number | null;
  /** Raw nutrition block (structure varies by site), minus JSON-LD noise. */
  nutrition: Record<string, string> | null;
  sourceUrl: string;
  sourceDomain: string;
  extractionMethod: ExtractionMethod;
}

/**
 * Preview returned to the client after importing a URL: the normalized
 * recipe plus catalog matching, shaped to stay backward compatible with the
 * former `POST /import/marmiton` response (`ParsedRecipe`).
 */
export interface RecipeImportPreview {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: RecipeStep[];
  /** Raw ingredient lines (kept even when normalization fails on a line). */
  ingredients: string[];
  matchedIngredients: MatchedIngredient[];
  imageUrl: string | null;
  sourceUrl: string;
  sourceDomain: string;
  importedAt: string;
  extractionMethod: ExtractionMethod;
  tags: string[];
  ingredientStepMapping: { [ingredientIndex: number]: number[] };
}

/** Strips the scheme/www from a URL to get the bare host for traceability. */
export function domainOfUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}
