import { Request, Response } from 'express';
import { RecipeService } from '../services/RecipeService';
import { RecipeConsumeService } from '../services/RecipeConsumeService';
import { RecipeAvailabilityService } from '../services/RecipeAvailabilityService';
import { CreateRecipeDto, UpdateRecipeDto, RecipeSearchParams } from '../types/RecipeDto';
import { ValidationError, NotFoundError } from '../errors/CustomErrors';

export class RecipeController {
  private recipeService: RecipeService;
  private recipeConsumeService: RecipeConsumeService;
  private recipeAvailabilityService: RecipeAvailabilityService;

  constructor() {
    this.recipeService = new RecipeService();
    this.recipeConsumeService = new RecipeConsumeService();
    this.recipeAvailabilityService = new RecipeAvailabilityService();
  }

  // GET /api/households/:householdId/recipes/availability
  getRecipesAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params as { householdId: string };
      const data = await this.recipeAvailabilityService.getRecipesAvailability(householdId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting recipes availability:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get recipes availability',
      });
    }
  };

  // GET /api/households/:householdId/recipes
  getRecipes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params as { householdId: string };
      const {
        search,
        difficulty,
        tags,
        maxPrepTime,
        maxCookTime,
        maxTotalTime,
        isFavorite,
        createdBy,
        itemId,
        limit = '20',
        offset = '0'
      } = req.query;

      const searchParams: RecipeSearchParams = {
        search: search as string,
        difficulty: difficulty as any,
        tags: tags ? (typeof tags === 'string' ? [tags] : tags as string[]) : undefined,
        maxPrepTime: maxPrepTime ? parseInt(maxPrepTime as string) : undefined,
        maxCookTime: maxCookTime ? parseInt(maxCookTime as string) : undefined,
        maxTotalTime: maxTotalTime ? parseInt(maxTotalTime as string) : undefined,
        isFavorite: isFavorite ? isFavorite === 'true' : undefined,
        createdBy: createdBy as string,
        itemId: itemId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await this.recipeService.getRecipes(householdId, searchParams);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('getRecipes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recipes'
      });
    }
  };

  // GET /api/households/:householdId/recipes/:id
  getRecipeById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };
      const recipe = await this.recipeService.getRecipeById(id, householdId);

      res.json({
        success: true,
        data: recipe
      });
    } catch (error) {
      console.error('getRecipeById error:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch recipe'
        });
      }
    }
  };

  // POST /api/households/:householdId/recipes
  createRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const recipeData: CreateRecipeDto = {
        ...req.body,
        householdId,
        createdBy: userId
      };

      // Validate required fields
      if (!recipeData.title || !recipeData.instructions || !recipeData.ingredients) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: title, instructions, ingredients'
        });
        return;
      }

      const recipe = await this.recipeService.createRecipe(recipeData);

      res.status(201).json({
        success: true,
        data: recipe
      });
    } catch (error: unknown) {
      console.error('createRecipe error:', error);

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      const err = error as { name?: string; errors?: Array<{ message?: string }> };
      if (err?.name === 'SequelizeValidationError' || err?.name === 'SequelizeForeignKeyConstraintError' || err?.name === 'SequelizeUniqueConstraintError') {
        const message = err.errors?.[0]?.message ?? 'Invalid recipe or ingredient data. Check that all articles exist and quantities are valid.';
        res.status(400).json({
          success: false,
          error: message
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create recipe'
      });
    }
  };

  // PUT /api/households/:householdId/recipes/:id
  updateRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };
      const updates: UpdateRecipeDto = req.body;

      const recipe = await this.recipeService.updateRecipe(id, householdId, updates);

      res.json({
        success: true,
        data: recipe
      });
    } catch (error: unknown) {
      console.error('updateRecipe error:', error);

      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      // Sequelize validation or FK constraint (e.g. invalid ingredient data)
      const err = error as { name?: string; errors?: Array<{ message?: string }> };
      if (err?.name === 'SequelizeValidationError' || err?.name === 'SequelizeForeignKeyConstraintError' || err?.name === 'SequelizeUniqueConstraintError') {
        const message = err.errors?.[0]?.message ?? 'Invalid recipe or ingredient data. Check that all articles exist and quantities are valid.';
        res.status(400).json({
          success: false,
          error: message
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update recipe'
      });
    }
  };

  // DELETE /api/households/:householdId/recipes/:id
  deleteRecipe = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };
      await this.recipeService.deleteRecipe(id, householdId);

      res.json({
        success: true,
        message: 'Recipe deleted successfully'
      });
    } catch (error) {
      console.error('deleteRecipe error:', error);

      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete recipe'
        });
      }
    }
  };

  // GET /api/households/:householdId/recipes/:id/deletion-impact
  getDeletionImpact = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };
      const impact = await this.recipeService.getDeletionImpact(id, householdId);
      res.json({ success: true, data: impact });
    } catch (error) {
      console.error('getDeletionImpact error:', error);
      if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Failed to compute deletion impact' });
      }
    }
  };

  // POST /api/households/:householdId/recipes/:id/favorite
  toggleFavorite = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };
      const recipe = await this.recipeService.toggleFavorite(id, householdId);

      res.json({
        success: true,
        data: recipe
      });
    } catch (error) {
      console.error('toggleFavorite error:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to toggle favorite status'
        });
      }
    }
  };

  // GET /api/households/:householdId/recipes/favorites
  getFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params as { householdId: string };
      const recipes = await this.recipeService.getFavoriteRecipes(householdId);

      res.json({
        success: true,
        data: recipes
      });
    } catch (error) {
      console.error('getFavorites error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch favorite recipes'
      });
    }
  };

  // GET /api/households/:householdId/recipes/tags
  getTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params as { householdId: string };
      const tags = await this.recipeService.getAllTags(householdId);

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('getTags error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recipe tags'
      });
    }
  };

  // GET /api/households/:householdId/recipes/stats
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params as { householdId: string };
      const stats = await this.recipeService.getRecipeStats(householdId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('getStats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recipe statistics'
      });
    }
  };

  // GET /api/households/:householdId/recipes/ingredients/stats
  getIngredientStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId } = req.params as { householdId: string };
      const stats = await this.recipeService.getIngredientUsageStats(householdId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('getIngredientStats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ingredient statistics'
      });
    }
  };

  // GET /api/households/:householdId/users/:userId/recipes
  getRecipesByUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, userId } = req.params as { householdId: string, userId: string };
      const recipes = await this.recipeService.getRecipesByUser(householdId, userId);

      res.json({
        success: true,
        data: recipes
      });
    } catch (error) {
      console.error('getRecipesByUser error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user recipes'
      });
    }
  };

  // GET /api/households/:householdId/recipes/:id/consume-preview
  getConsumePreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      const servings = req.query.servings
        ? parseInt(req.query.servings as string)
        : undefined;

      if (servings !== undefined && (isNaN(servings) || servings < 1)) {
        res.status(400).json({
          success: false,
          error: 'Servings must be a positive integer',
        });
        return;
      }

      const preview = await this.recipeConsumeService.getConsumePreview(
        id,
        householdId,
        servings
      );

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      console.error('getConsumePreview error:', error);

      if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate consume preview',
        });
      }
    }
  };

  // POST /api/households/:householdId/recipes/:id/consume
  consumeIngredients = async (req: Request, res: Response): Promise<void> => {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      const userId = (req.user as any)?.id;
      const { deductions } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!deductions || !Array.isArray(deductions) || deductions.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Deductions array is required and must not be empty',
        });
        return;
      }

      const result = await this.recipeConsumeService.consumeIngredients(
        id,
        householdId,
        userId,
        deductions
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('consumeIngredients error:', error);

      if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to consume ingredients',
        });
      }
    }
  };
} 