import { IngredientMatchingService } from './IngredientMatchingService';
import { extractRecipe } from './recipeImport/extract';
import { RecipeFetcher } from './recipeImport/recipeFetcher';
import { NoRecipeFoundError } from './recipeImport/errors';
import { enrichFromMarmitonDom, isMarmitonDomain } from './recipeImport/marmitonEnricher';
import { ImportedRecipe, RecipeImportPreview, domainOfUrl } from './recipeImport/types';
import { RecipeDifficulty } from '../models/Recipe';

export interface ImportOptions {
  householdId?: string;
  language?: string;
}

/**
 * Orchestrates the recipe import pipeline:
 *   fetch (compliance-gated) → extract (Schema.org first, DOM fallback) →
 *   ingredient normalization + catalog matching → review-ready preview.
 *
 * `previewFromHtml` is the network-free entry point used by integration
 * tests (saved fixture pages) and any future batch tooling that already
 * holds the HTML.
 */
export class RecipeImportService {
  private readonly fetcher: RecipeFetcher;
  private readonly ingredientMatchingService: IngredientMatchingService;

  constructor(options?: {
    fetcher?: RecipeFetcher;
    ingredientMatchingService?: IngredientMatchingService;
  }) {
    this.fetcher = options?.fetcher ?? new RecipeFetcher();
    this.ingredientMatchingService =
      options?.ingredientMatchingService ?? new IngredientMatchingService();
  }

  async importFromUrl(url: string, options: ImportOptions = {}): Promise<RecipeImportPreview> {
    const { html, finalUrl } = await this.fetcher.fetchHtml(url);
    // Keep the URL the user pasted for traceability unless the site
    // redirected to a canonical recipe page.
    const sourceUrl = finalUrl || url;
    return this.previewFromHtml(html, sourceUrl, options);
  }

  async previewFromHtml(
    html: string,
    url: string,
    options: ImportOptions = {}
  ): Promise<RecipeImportPreview> {
    const recipe = extractRecipe(html, url);
    if (!recipe || (!recipe.title && recipe.rawIngredients.length === 0)) {
      throw new NoRecipeFoundError(url);
    }

    const matchedIngredients = await this.ingredientMatchingService.matchIngredients(
      recipe.rawIngredients,
      options.language ?? 'fr',
      options.householdId
    );

    let difficulty: RecipeDifficulty = 'Medium';
    let ingredientStepMapping: { [ingredientIndex: number]: number[] } = {};
    if (isMarmitonDomain(recipe.sourceDomain)) {
      const enrichment = enrichFromMarmitonDom(html, recipe.rawIngredients);
      if (enrichment.difficulty) difficulty = enrichment.difficulty;
      ingredientStepMapping = enrichment.ingredientStepMapping;
    }

    return this.toPreview(recipe, matchedIngredients, difficulty, ingredientStepMapping);
  }

  private toPreview(
    recipe: ImportedRecipe,
    matchedIngredients: RecipeImportPreview['matchedIngredients'],
    difficulty: RecipeDifficulty,
    ingredientStepMapping: { [ingredientIndex: number]: number[] }
  ): RecipeImportPreview {
    // Tags merge Schema.org categories/cuisines/keywords, deduplicated and
    // capped: keywords fields are frequently SEO dumps of 20+ entries.
    const tags = [...new Set([...recipe.categories, ...recipe.cuisines, ...recipe.keywords])]
      .slice(0, 8);

    return {
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description ?? '',
      prepTime: recipe.prepMin ?? 0,
      cookTime: recipe.cookMin ?? 0,
      servings: recipe.servings ?? 4,
      difficulty,
      instructions: recipe.steps,
      ingredients: recipe.rawIngredients,
      matchedIngredients,
      imageUrl: recipe.imageUrl,
      sourceUrl: recipe.sourceUrl,
      sourceDomain: recipe.sourceDomain || domainOfUrl(recipe.sourceUrl),
      importedAt: new Date().toISOString(),
      extractionMethod: recipe.extractionMethod,
      tags,
      ingredientStepMapping,
    };
  }
}
