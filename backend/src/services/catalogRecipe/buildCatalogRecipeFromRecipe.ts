import {
  CatalogOriginType,
  CatalogRecipeCreationAttributes,
  CatalogRecipeStatus,
} from '../../models/CatalogRecipe';
import { CatalogRecipeIngredientCreationAttributes } from '../../models/CatalogRecipeIngredient';
import { RecipeDifficulty } from '../../models/Recipe';
import { RecipeStep } from '../../types/RecipeDto';
import { Unit } from '../../types/enums';

/**
 * Article référencé par un ingrédient de recette perso. `householdId` est la
 * donnée décisive : `null` = article du catalogue global (partagé par tous les
 * foyers), non-null = article privé au foyer.
 */
export interface CatalogRecipeCopyItem {
  id: string;
  name: string;
  householdId: string | null;
}

export interface CatalogRecipeIngredientCopySource {
  itemId: string;
  quantity: number | null;
  unit: Unit;
  isFreeQuantity: boolean;
  notes: string | null;
  usedInSteps: number[];
  /** Toujours chargé : `recipe_ingredients.itemId` est NOT NULL avec une FK. */
  item: CatalogRecipeCopyItem;
}

export interface CatalogRecipeCopySource {
  id: string;
  title: string;
  description: string | null;
  instructions: RecipeStep[];
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  householdId: string;
  ingredients: CatalogRecipeIngredientCopySource[];
}

export type BuiltCatalogRecipeIngredient = Omit<
  CatalogRecipeIngredientCreationAttributes,
  'catalogRecipeId'
>;

export interface BuiltCatalogRecipe {
  recipe: CatalogRecipeCreationAttributes;
  ingredients: BuiltCatalogRecipeIngredient[];
}

/**
 * Construit la copie catalogue d'une recette perso.
 *
 * Publier = figer une copie indépendante : toutes les structures imbriquées
 * (instructions, tags, usedInSteps) sont clonées, jamais partagées par
 * référence avec la recette source. Modifier la recette perso ensuite n'a donc
 * aucun effet sur la publication.
 *
 * Fonction pure : aucune lecture, aucune écriture, aucune dépendance à une
 * connexion base de données.
 */
export function buildCatalogRecipeFromRecipe(
  source: CatalogRecipeCopySource,
  options: { authorUserId: string; publishedAt?: Date }
): BuiltCatalogRecipe {
  const publishedAt = options.publishedAt ?? new Date();

  return {
    recipe: {
      title: source.title,
      description: source.description,
      instructions: cloneInstructions(source.instructions),
      tags: [...source.tags],
      prepTime: source.prepTime,
      cookTime: source.cookTime,
      servings: source.servings,
      difficulty: source.difficulty,
      imageUrl: source.imageUrl,
      authorUserId: options.authorUserId,
      authorHouseholdId: source.householdId,
      sourceRecipeId: source.id,
      originType: CatalogOriginType.COMMUNITY,
      sourceUrl: source.sourceUrl,
      sourceDomain: source.sourceDomain,
      status: CatalogRecipeStatus.PUBLISHED,
      publishedAt,
    },
    ingredients: source.ingredients.map(copyIngredient),
  };
}

/**
 * Un article privé au foyer auteur n'a aucun sens pour les autres foyers : son
 * identifiant est abandonné et seul son nom est conservé, dans `rawText`. Le
 * re-rattachement à un article global équivalent est un travail ultérieur.
 */
function copyIngredient(
  ingredient: CatalogRecipeIngredientCopySource,
  index: number
): BuiltCatalogRecipeIngredient {
  const isGlobalItem = ingredient.item.householdId === null;

  return {
    itemId: isGlobalItem ? ingredient.itemId : null,
    rawText: isGlobalItem ? null : ingredient.item.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    isFreeQuantity: ingredient.isFreeQuantity,
    notes: ingredient.notes,
    usedInSteps: [...ingredient.usedInSteps],
    displayOrder: index,
  };
}

function cloneInstructions(steps: RecipeStep[]): RecipeStep[] {
  return steps.map(step => ({ text: step.text, duration: step.duration ?? null }));
}
