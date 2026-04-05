import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { IngredientMatchingService, MatchedIngredient } from '../services/IngredientMatchingService';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const ingredientMatchingService = new IngredientMatchingService();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

interface RecipeStep {
  text: string;
  duration?: number | null;
}

interface ParsedRecipe {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  instructions: RecipeStep[];
  ingredients: string[];
  matchedIngredients: MatchedIngredient[];
  imageUrl: string | null;
  sourceUrl: string;
  ingredientStepMapping: { [ingredientIndex: number]: number[] };
}

// Parse ISO 8601 duration (e.g., "PT30M", "PT1H30M") to minutes
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  
  return hours * 60 + minutes;
}

// Parse ISO 8601 duration to seconds (for per-step durations)
function parseDurationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

// Map Marmiton difficulty to our difficulty levels
function mapDifficulty(difficulty: string | undefined): 'Easy' | 'Medium' | 'Hard' {
  if (!difficulty) return 'Medium';
  
  const lowerDifficulty = difficulty.toLowerCase();
  if (lowerDifficulty.includes('très facile') || lowerDifficulty.includes('facile')) {
    return 'Easy';
  }
  if (lowerDifficulty.includes('difficile')) {
    return 'Hard';
  }
  return 'Medium';
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

function isAllowedMarmitonUrl(rawUrl: string): boolean {
  try {
    const parsedUrl = new URL(rawUrl);
    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    return hostname === 'marmiton.org' || hostname.endsWith('.marmiton.org');
  } catch {
    return false;
  }
}

router.post('/import/marmiton', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const normalizedUrl = url.trim();
  if (!isAllowedMarmitonUrl(normalizedUrl)) {
    return res.status(400).json({ error: 'URL must be from marmiton.org' });
  }

  try {
    const response = await axios.get(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Find JSON-LD structured data
    let recipeData: any = null;
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '');
        // Handle both single object and array of objects
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item['@type'] === 'Recipe') {
            recipeData = item;
            break;
          }
        }
      } catch (e) {
        // Continue to next script tag
      }
    });

    if (!recipeData) {
      return res.status(400).json({ error: 'Could not find recipe data on this page' });
    }

    // Extract difficulty from the page (not in JSON-LD typically)
    let difficulty: string | undefined;
    $('.recipe-primary__tags, .mrtn-recipe-info').each((_, element) => {
      const text = $(element).text().toLowerCase();
      if (text.includes('très facile')) {
        difficulty = 'très facile';
      } else if (text.includes('facile')) {
        difficulty = 'facile';
      } else if (text.includes('moyen')) {
        difficulty = 'moyen';
      } else if (text.includes('difficile')) {
        difficulty = 'difficile';
      }
    });

    // Parse ingredients - can be string or array of objects with text property
    const ingredients: string[] = [];
    if (Array.isArray(recipeData.recipeIngredient)) {
      for (const ing of recipeData.recipeIngredient) {
        if (typeof ing === 'string') {
          ingredients.push(ing.trim());
        } else if (ing && typeof ing === 'object' && ing.text) {
          ingredients.push(ing.text.trim());
        }
      }
    }

    // Parse instructions into RecipeStep objects with optional durations
    const instructions: RecipeStep[] = [];
    if (Array.isArray(recipeData.recipeInstructions)) {
      for (const inst of recipeData.recipeInstructions) {
        if (typeof inst === 'string') {
          instructions.push({ text: inst.trim(), duration: null });
        } else if (inst && typeof inst === 'object') {
          if (inst.text) {
            instructions.push({
              text: inst.text.trim(),
              duration: parseDurationToSeconds(inst.performTime),
            });
          } else if (inst.itemListElement && Array.isArray(inst.itemListElement)) {
            for (const step of inst.itemListElement) {
              if (step.text) {
                instructions.push({
                  text: step.text.trim(),
                  duration: parseDurationToSeconds(step.performTime),
                });
              }
            }
          }
        }
      }
    }

    // Get image URL: first from JSON-LD, then fallbacks from the page
    let imageUrl: string | null = null;
    if (recipeData.image) {
      if (typeof recipeData.image === 'string') {
        imageUrl = recipeData.image;
      } else if (Array.isArray(recipeData.image) && recipeData.image.length > 0) {
        imageUrl = typeof recipeData.image[0] === 'string'
          ? recipeData.image[0]
          : recipeData.image[0]?.url || null;
      } else if (recipeData.image.url) {
        imageUrl = recipeData.image.url;
      }
    }
    // Fallback: first photo from the page (og:image or first recipe image)
    if (!imageUrl) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        imageUrl = ogImage;
      }
    }
    if (!imageUrl) {
      const firstRecipeImg = $('.recipe-media img, .mrtn-recipe-header img, [class*="recipe"] img, main img').first().attr('src');
      if (firstRecipeImg) {
        imageUrl = firstRecipeImg.startsWith('http') ? firstRecipeImg : new URL(firstRecipeImg, normalizedUrl).href;
      }
    }

    // Parse servings (recipeYield can be string or number)
    let servings = 4;
    if (recipeData.recipeYield) {
      if (typeof recipeData.recipeYield === 'number') {
        servings = recipeData.recipeYield;
      } else if (typeof recipeData.recipeYield === 'string') {
        const match = recipeData.recipeYield.match(/(\d+)/);
        if (match) {
          servings = parseInt(match[1], 10);
        }
      } else if (Array.isArray(recipeData.recipeYield) && recipeData.recipeYield.length > 0) {
        const yieldStr = recipeData.recipeYield[0];
        const match = String(yieldStr).match(/(\d+)/);
        if (match && match[1]) {
          servings = parseInt(match[1], 10);
        }
      }
    }

    // Match ingredients with database items
    // Defensive guard: this route is authenticated at router level and
    // should always have req.user set by the auth middleware.
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const householdId = user?.selectedHouseholdId;
    
    const matchedIngredients = await ingredientMatchingService.matchIngredients(
      ingredients,
      'fr',  // Marmiton is French
      householdId
    );

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

    const parsedRecipe: ParsedRecipe = {
      title: recipeData.name || 'Untitled Recipe',
      description: recipeData.description || '',
      prepTime: parseDuration(recipeData.prepTime),
      cookTime: parseDuration(recipeData.cookTime),
      servings,
      difficulty: mapDifficulty(difficulty || ''),
      instructions,
      ingredients,
      matchedIngredients,
      imageUrl,
      sourceUrl: normalizedUrl,
      ingredientStepMapping,
    };

    return res.json(parsedRecipe);
  } catch (error) {
    console.error('Failed to fetch Marmiton page:', error);
    return res.status(500).json({ error: 'Failed to fetch recipe page' });
  }
});

export default router;
