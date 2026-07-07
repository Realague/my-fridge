import { Request, Response } from 'express';
import { RecipeImportService } from '../services/RecipeImportService';
import {
  FetchFailedError,
  NoRecipeFoundError,
  RobotsDisallowedError,
  SourceNotAllowedError,
} from '../services/recipeImport/errors';

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export class RecipeImportController {
  private recipeImportService: RecipeImportService;

  constructor() {
    this.recipeImportService = new RecipeImportService();
  }

  // POST /api/import/recipe  (and legacy POST /api/import/marmiton)
  importRecipe = async (req: Request, res: Response): Promise<void> => {
    const { url } = req.body ?? {};

    if (!url || typeof url !== 'string' || !isValidHttpUrl(url.trim())) {
      res.status(400).json({ success: false, error: 'A valid http(s) URL is required' });
      return;
    }
    const normalizedUrl = url.trim();

    // Route-level auth middleware guarantees req.user; defensive fallback.
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    try {
      const preview = await this.recipeImportService.importFromUrl(normalizedUrl, {
        householdId: user.selectedHouseholdId,
        language: 'fr',
      });
      // Body kept flat (not wrapped in ApiResponse.data) for backward
      // compatibility with the pre-existing /import/marmiton contract.
      res.json(preview);
    } catch (error) {
      if (error instanceof SourceNotAllowedError) {
        res.status(403).json({ success: false, error: error.message, code: 'SOURCE_NOT_ALLOWED' });
      } else if (error instanceof RobotsDisallowedError) {
        res.status(403).json({ success: false, error: error.message, code: 'ROBOTS_DISALLOWED' });
      } else if (error instanceof NoRecipeFoundError) {
        res.status(422).json({
          success: false,
          error: 'Could not find recipe data on this page',
          code: 'NO_RECIPE_FOUND',
        });
      } else if (error instanceof FetchFailedError) {
        res.status(502).json({
          success: false,
          error: 'Failed to fetch recipe page',
          code: 'FETCH_FAILED',
        });
      } else {
        console.error('Recipe import failed:', error);
        res.status(500).json({ success: false, error: 'Failed to import recipe' });
      }
    }
  };
}
