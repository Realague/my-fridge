import sequelize from '../config/database';
import { NotFoundError } from '../errors/CustomErrors';
import { CatalogRecipe } from '../models/CatalogRecipe';
import { CatalogRecipeIngredient } from '../models/CatalogRecipeIngredient';
import { Item } from '../models/Item';
import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import {
  buildCatalogRecipeFromRecipe,
  CatalogRecipeCopySource,
} from '../services/catalogRecipe/buildCatalogRecipeFromRecipe';

export class CatalogRecipeRepository {
  /**
   * Publie une recette perso : crée une copie figée et indépendante dans le
   * catalogue global. La recette source n'est jamais modifiée.
   *
   * Prend un identifiant plutôt qu'une instance déjà chargée : la copie a besoin
   * du `householdId` de chaque article pour décider quels `itemId` sont
   * publiables, et c'est au repository de garantir que ces données sont là.
   */
  async createFromRecipe(recipeId: string, authorUserId: string): Promise<CatalogRecipe> {
    return await sequelize.transaction(async (transaction) => {
      const recipe = await Recipe.findByPk(recipeId, {
        include: [
          {
            model: RecipeIngredient,
            as: 'ingredients',
            include: [{ model: Item, as: 'item' }],
          },
        ],
        // Ordre stable : il devient le displayOrder de la copie.
        order: [[{ model: RecipeIngredient, as: 'ingredients' }, 'createdAt', 'ASC']],
        transaction,
      });

      if (!recipe) {
        throw new NotFoundError(`Recipe ${recipeId} not found`);
      }

      const built = buildCatalogRecipeFromRecipe(toCopySource(recipe), { authorUserId });

      const catalogRecipe = await CatalogRecipe.create(built.recipe, { transaction });

      if (built.ingredients.length > 0) {
        await CatalogRecipeIngredient.bulkCreate(
          built.ingredients.map(ingredient => ({
            ...ingredient,
            catalogRecipeId: catalogRecipe.id,
          })),
          { transaction, validate: true }
        );
      }

      return catalogRecipe;
    });
  }

  async findByIdWithIngredients(id: string): Promise<CatalogRecipe | null> {
    return await CatalogRecipe.findByPk(id, {
      include: [
        {
          model: CatalogRecipeIngredient,
          as: 'ingredients',
          include: [{ model: Item, as: 'item' }],
        },
      ],
      order: [[{ model: CatalogRecipeIngredient, as: 'ingredients' }, 'displayOrder', 'ASC']],
    });
  }
}

/** Réduit l'instance Sequelize aux données dont la copie a besoin. */
function toCopySource(recipe: Recipe): CatalogRecipeCopySource {
  const ingredients = recipe.ingredients ?? [];

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    tags: recipe.tags,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    sourceDomain: recipe.sourceDomain,
    householdId: recipe.householdId,
    ingredients: ingredients.map(ingredient => {
      const item = ingredient.item;
      if (!item) {
        throw new NotFoundError(
          `Item ${ingredient.itemId} of recipe ingredient ${ingredient.id} could not be loaded`
        );
      }

      return {
        itemId: ingredient.itemId,
        // Sequelize renvoie les DECIMAL en string : la copie doit rester numérique.
        quantity: ingredient.quantity === null ? null : Number(ingredient.quantity),
        unit: ingredient.unit,
        isFreeQuantity: ingredient.isFreeQuantity,
        notes: ingredient.notes,
        usedInSteps: ingredient.usedInSteps ?? [],
        item: { id: item.id, name: item.name, householdId: item.householdId },
      };
    }),
  };
}
