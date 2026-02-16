import { MealPlanRepository } from '../repositories/MealPlanRepository';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { ShoppingItemRepository } from '../repositories/ShoppingItemRepository';
import { CreateMealPlanDto, UpdateMealPlanDto, MealPlanDto, MealPlanQueryParams, ShoppingListItemDto } from '../types/MealPlanDto';
import { CreateShoppingItemDto } from '../types/ItemDto';
import { MealPlan } from '../models/MealPlan';
import { ConflictError, NotFoundError, ValidationError } from '../errors/CustomErrors';

export class MealPlanService {
  private mealPlanRepository: MealPlanRepository;
  private recipeRepository: RecipeRepository;
  private itemRepository: ItemRepository;
  private shoppingItemRepository: ShoppingItemRepository;

  constructor() {
    this.mealPlanRepository = new MealPlanRepository();
    this.recipeRepository = new RecipeRepository();
    this.itemRepository = new ItemRepository();
    this.shoppingItemRepository = new ShoppingItemRepository();
  }

  async createMealPlan(
    householdId: string,
    mealPlanData: CreateMealPlanDto
  ): Promise<MealPlanDto> {
    // Validate input
    this.validateMealPlanData(mealPlanData);

    // Check if recipe exists and belongs to household
    const recipe = await this.recipeRepository.findById(mealPlanData.recipeId, householdId);
    if (!recipe) {
      throw new NotFoundError('Recipe not found or does not belong to this household');
    }

    // Check for duplicate meal plan (same date, meal type, and household)
    const existingMealPlan = await this.mealPlanRepository.checkDuplicate(
      householdId,
      mealPlanData.date,
      mealPlanData.mealType
    );

    if (existingMealPlan) {
      throw new ConflictError(`A meal plan already exists for ${mealPlanData.mealType} on ${mealPlanData.date}`);
    }

    const mealPlan = await this.mealPlanRepository.create({
      householdId,
      recipeId: mealPlanData.recipeId,
      date: mealPlanData.date,
      mealType: mealPlanData.mealType,
      servings: mealPlanData.servings || 1,
      notes: mealPlanData.notes,
    });

    const mealPlanWithRecipe = await this.mealPlanRepository.findById(mealPlan.id, true);
    return this.transformToDto(mealPlanWithRecipe!);
  }

  async getMealPlanById(id: string, householdId: string): Promise<MealPlanDto> {
    const mealPlan = await this.mealPlanRepository.findById(id, true);
    
    if (!mealPlan || mealPlan.householdId !== householdId) {
      throw new NotFoundError('Meal plan not found');
    }

    return this.transformToDto(mealPlan);
  }

  async getMealPlansByHousehold(
    householdId: string,
    params: MealPlanQueryParams = {}
  ): Promise<{ mealPlans: MealPlanDto[], total: number }> {
    const { mealPlans, total } = await this.mealPlanRepository.findByHousehold(householdId, params);
    
    return {
      mealPlans: mealPlans.map(mp => this.transformToDto(mp)),
      total
    };
  }

  async getMealPlansByDateRange(
    householdId: string,
    startDate: string,
    endDate: string
  ): Promise<MealPlanDto[]> {
    this.validateDateRange(startDate, endDate);
    
    const mealPlans = await this.mealPlanRepository.findByDateRange(householdId, startDate, endDate);
    return mealPlans.map(mp => this.transformToDto(mp));
  }

  async getMealPlansByDate(householdId: string, date: string): Promise<MealPlanDto[]> {
    this.validateDate(date);
    
    const mealPlans = await this.mealPlanRepository.findByDate(householdId, date);
    return mealPlans.map(mp => this.transformToDto(mp));
  }

  async updateMealPlan(
    id: string,
    householdId: string,
    updates: UpdateMealPlanDto
  ): Promise<MealPlanDto> {
    const existingMealPlan = await this.mealPlanRepository.findById(id);
    
    if (!existingMealPlan || existingMealPlan.householdId !== householdId) {
      throw new NotFoundError('Meal plan not found');
    }

    // Validate updates
    if (updates.date || updates.mealType) {
      const date = updates.date || existingMealPlan.date;
      const mealType = updates.mealType || existingMealPlan.mealType;
      
      // Check for duplicate if date or mealType is being changed
      if (date !== existingMealPlan.date || mealType !== existingMealPlan.mealType) {
        const duplicate = await this.mealPlanRepository.checkDuplicate(
          householdId,
          date,
          mealType,
          id
        );
        
        if (duplicate) {
          throw new ConflictError(`A meal plan already exists for ${mealType} on ${date}`);
        }
      }
    }

    // Validate recipe if being updated
    if (updates.recipeId) {
      const recipe = await this.recipeRepository.findById(updates.recipeId, householdId);
      if (!recipe) {
        throw new NotFoundError('Recipe not found or does not belong to this household');
      }
    }

    const updatedMealPlan = await this.mealPlanRepository.update(id, updates);
    
    if (!updatedMealPlan) {
      throw new NotFoundError('Failed to update meal plan');
    }

    return this.transformToDto(updatedMealPlan);
  }

  async deleteMealPlan(id: string, householdId: string): Promise<void> {
    const mealPlan = await this.mealPlanRepository.findById(id);
    
    if (!mealPlan || mealPlan.householdId !== householdId) {
      throw new NotFoundError('Meal plan not found');
    }

    const deleted = await this.mealPlanRepository.delete(id);
    
    if (!deleted) {
      throw new NotFoundError('Failed to delete meal plan');
    }
  }

  async generateShoppingList(
    householdId: string,
    startDate: string,
    endDate: string,
    createdBy: string
  ): Promise<ShoppingListItemDto[]> {
    this.validateDateRange(startDate, endDate);

    const mealPlans = await this.mealPlanRepository.findByDateRange(householdId, startDate, endDate, true);
    
    // Import unit conversion utilities
    const { convertQuantity, canConvertUnits, normalizeToBaseUnit, getBestDisplayUnit, convertToStorageUnit } = require('../utils/unitConversion');
    const StoredItemRepository = require('../repositories/StoredItemRepository').StoredItemRepository;
    const storedItemRepository = new StoredItemRepository();
    
    // Group ingredients by item ID and calculate total quantities with unit conversion
    const ingredientTotals = new Map<string, {
      itemId: string;
      itemName: string;
      itemCategory: string;
      totalQuantityInBaseUnit: number;
      baseUnit: string;
      recipes: string[];
    }>();

    for (const mealPlan of mealPlans) {
      const recipe = await this.recipeRepository.findById(mealPlan.recipeId, householdId);
      if (!recipe) continue;

      for (const ingredient of recipe.ingredients || []) {
        
        const neededQuantity = Number(ingredient.quantity / recipe.servings * mealPlan.servings);
        
        // Normalize to base unit for aggregation
        const normalized = normalizeToBaseUnit(neededQuantity, ingredient.unit);
        const key = ingredient.itemId+normalized.unit;

        if (ingredientTotals.has(key)) {
          const existing = ingredientTotals.get(key)!;
          // Only aggregate if same base unit (weight with weight, volume with volume)
          if (existing.baseUnit === normalized.unit) {
            existing.totalQuantityInBaseUnit += normalized.quantity;
          }
          if (!existing.recipes.includes(recipe.title)) {
            existing.recipes.push(recipe.title);
          }
        } else {
          const item = await this.itemRepository.findById(ingredient.itemId);
          if (item) {
            ingredientTotals.set(key, {
              itemId: item.id,
              itemName: item.name,
              itemCategory: item.category,
              totalQuantityInBaseUnit: normalized.quantity,
              baseUnit: normalized.unit,
              recipes: [recipe.title]
            });
          }
        }
      }
    }

    // Check current stock and calculate what's actually needed
    const neededItems = new Map<string, {
      itemId: string;
      itemName: string;
      quantityNeeded: number;
      unit: string;
      recipes: string[];
    }>();

    for (const [key, data] of ingredientTotals) {
      // Get current stock in the same base unit
      const currentStock = await storedItemRepository.getTotalQuantityByItem(
        data.itemId,
        householdId,
        data.baseUnit
      );

      // Calculate shortage
      const shortage = data.totalQuantityInBaseUnit - currentStock;
      
      if (shortage > 0) {
        // Convert to best display unit (kg instead of 1000g, etc.)
        // Use forStorage=true to ensure we get storage-appropriate units only
        // For volume measurements of dry goods, try to convert to weight based on category
        let display;
        if (data.baseUnit === 'ml' && (data.itemCategory === 'spices' || data.itemCategory === 'grains' || data.itemCategory === 'condiments')) {
          // Try volume-to-weight conversion for dry ingredients
          const weightConversion = convertToStorageUnit(shortage, data.baseUnit, data.itemCategory);
          display = weightConversion;
        } else {
          display = getBestDisplayUnit(shortage, data.baseUnit, true);
        }
        
        neededItems.set(key, {
          itemId: data.itemId,
          itemName: data.itemName,
          quantityNeeded: display.quantity,
          unit: display.unit,
          recipes: data.recipes
        });
      }
    }

    console.log(neededItems);

    // Create shopping items in the database (only for items that are needed)
    const createdShoppingItems: ShoppingListItemDto[] = [];
    for (const [key, data] of neededItems) {
      try {
        const shoppingItemData: CreateShoppingItemDto = {
          itemId: data.itemId,
          householdId,
          quantity: data.quantityNeeded,
          unit: data.unit,
          createdBy,
          priority: 0
        };

        await this.shoppingItemRepository.create(shoppingItemData);
        
        createdShoppingItems.push({
          itemId: data.itemId,
          itemName: data.itemName,
          totalQuantity: data.quantityNeeded,
          unit: data.unit,
          recipes: data.recipes
        });
      } catch (error) {
        console.error(`Error creating shopping item for ${data.itemName}:`, error);
        // Continue with other items even if one fails
      }
    }

    return createdShoppingItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }

  async getMealPlanStats(householdId: string, startDate?: string, endDate?: string) {
    return await this.mealPlanRepository.getMealPlanStats(householdId, startDate, endDate);
  }

  private validateMealPlanData(data: CreateMealPlanDto | UpdateMealPlanDto): void {
    if (data.date) {
      this.validateDate(data.date);
    }

    if (data.servings !== undefined && (data.servings < 1 || data.servings > 20)) {
      throw new ValidationError('Servings must be between 1 and 20');
    }

    if (data.notes && data.notes.length > 500) {
      throw new ValidationError('Notes cannot exceed 500 characters');
    }
  }

  private validateDate(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new ValidationError('Date must be in YYYY-MM-DD format');
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Invalid date');
    }
  }

  private validateDateRange(startDate: string, endDate: string): void {
    this.validateDate(startDate);
    this.validateDate(endDate);

    if (new Date(startDate) > new Date(endDate)) {
      throw new ValidationError('Start date must be before or equal to end date');
    }
  }

  private transformToDto(mealPlan: MealPlan): MealPlanDto {
    return {
      id: mealPlan.id,
      householdId: mealPlan.householdId,
      recipeId: mealPlan.recipeId,
      date: mealPlan.date,
      mealType: mealPlan.mealType,
      servings: mealPlan.servings,
      notes: mealPlan.notes || undefined,
      createdAt: mealPlan.createdAt.toISOString(),
      updatedAt: mealPlan.updatedAt.toISOString(),
      recipe: (mealPlan as any).recipe ? {
        id: (mealPlan as any).recipe.id,
        title: (mealPlan as any).recipe.title,
        prepTime: (mealPlan as any).recipe.prepTime,
        cookTime: (mealPlan as any).recipe.cookTime,
        servings: (mealPlan as any).recipe.servings,
        difficulty: (mealPlan as any).recipe.difficulty,
      } : undefined
    };
  }
} 