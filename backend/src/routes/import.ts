import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { IngredientMatchingService, MatchedIngredient } from '../services/IngredientMatchingService';

const router = Router();
const ingredientMatchingService = new IngredientMatchingService();

interface ParsedRecipe {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  instructions: string[];
  ingredients: string[];
  matchedIngredients: MatchedIngredient[];
  imageUrl: string | null;
  sourceUrl: string;
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

router.post('/import/marmiton', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.includes('marmiton.org')) {
    return res.status(400).json({ error: 'URL must be from marmiton.org' });
  }

  try {
    const response = await axios.get(url, {
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

    // Parse instructions
    const instructions: string[] = [];
    if (Array.isArray(recipeData.recipeInstructions)) {
      for (const inst of recipeData.recipeInstructions) {
        if (typeof inst === 'string') {
          instructions.push(inst.trim());
        } else if (inst && typeof inst === 'object') {
          // HowToStep or HowToSection
          if (inst.text) {
            instructions.push(inst.text.trim());
          } else if (inst.itemListElement && Array.isArray(inst.itemListElement)) {
            for (const step of inst.itemListElement) {
              if (step.text) {
                instructions.push(step.text.trim());
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
        imageUrl = firstRecipeImg.startsWith('http') ? firstRecipeImg : new URL(firstRecipeImg, url).href;
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
    // Get householdId from authenticated user if available
    const user = (req as any).user;
    const householdId = user?.selectedHouseholdId;
    
    const matchedIngredients = await ingredientMatchingService.matchIngredients(
      ingredients,
      'fr',  // Marmiton is French
      householdId
    );

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
      sourceUrl: url,
    };

    return res.json(parsedRecipe);
  } catch (error) {
    console.error('Failed to fetch Marmiton page:', error);
    return res.status(500).json({ error: 'Failed to fetch recipe page' });
  }
});

export default router;
