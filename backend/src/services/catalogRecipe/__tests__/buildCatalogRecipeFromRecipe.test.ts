import { describe, expect, it } from 'vitest';
import {
  buildCatalogRecipeFromRecipe,
  CatalogRecipeCopySource,
} from '../buildCatalogRecipeFromRecipe';
import { CatalogOriginType, CatalogRecipeStatus } from '../../../models/CatalogRecipe';
import { Unit } from '../../../types/enums';

const RECIPE_ID = '11111111-1111-4111-8111-111111111111';
const HOUSEHOLD_ID = '33333333-3333-4333-8333-333333333333';
const AUTHOR_ID = '44444444-4444-4444-8444-444444444444';
const GLOBAL_ITEM_ID = '55555555-5555-4555-8555-555555555555';
const PRIVATE_ITEM_ID = '66666666-6666-4666-8666-666666666666';

function makeSource(overrides: Partial<CatalogRecipeCopySource> = {}): CatalogRecipeCopySource {
  return {
    id: RECIPE_ID,
    title: 'Gratin dauphinois',
    description: 'Le vrai, sans fromage.',
    instructions: [
      { text: 'Éplucher les pommes de terre.', duration: 10 },
      { text: 'Enfourner.', duration: 60 },
    ],
    tags: ['gratin', 'hiver'],
    prepTime: 20,
    cookTime: 60,
    servings: 4,
    difficulty: 'Medium',
    imageUrl: 'https://cdn.example/gratin.jpg',
    sourceUrl: null,
    sourceDomain: null,
    householdId: HOUSEHOLD_ID,
    ingredients: [
      {
        itemId: GLOBAL_ITEM_ID,
        quantity: 1,
        unit: Unit.KG,
        isFreeQuantity: false,
        notes: 'à chair ferme',
        usedInSteps: [0],
        item: { id: GLOBAL_ITEM_ID, name: 'Pomme de terre', householdId: null },
      },
      {
        itemId: PRIVATE_ITEM_ID,
        quantity: 200,
        unit: Unit.ML,
        isFreeQuantity: false,
        notes: null,
        usedInSteps: [1],
        item: { id: PRIVATE_ITEM_ID, name: 'Crème de la ferme du coin', householdId: HOUSEHOLD_ID },
      },
    ],
    ...overrides,
  };
}

describe('buildCatalogRecipeFromRecipe', () => {
  it('copie les champs de la recette et marque la publication', () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.recipe.title).toBe('Gratin dauphinois');
    expect(built.recipe.description).toBe('Le vrai, sans fromage.');
    expect(built.recipe.prepTime).toBe(20);
    expect(built.recipe.cookTime).toBe(60);
    expect(built.recipe.servings).toBe(4);
    expect(built.recipe.difficulty).toBe('Medium');
    expect(built.recipe.imageUrl).toBe('https://cdn.example/gratin.jpg');
    expect(built.recipe.tags).toEqual(['gratin', 'hiver']);
    expect(built.recipe.instructions).toEqual([
      { text: 'Éplucher les pommes de terre.', duration: 10 },
      { text: 'Enfourner.', duration: 60 },
    ]);
    expect(built.recipe.sourceRecipeId).toBe(RECIPE_ID);
    expect(built.recipe.authorHouseholdId).toBe(HOUSEHOLD_ID);
    expect(built.recipe.authorUserId).toBe(AUTHOR_ID);
    expect(built.recipe.originType).toBe(CatalogOriginType.COMMUNITY);
    expect(built.recipe.status).toBe(CatalogRecipeStatus.PUBLISHED);
    expect(built.recipe.publishedAt).toBeInstanceOf(Date);
  });

  it("préserve l'itemId des articles du catalogue global", () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.ingredients[0]).toMatchObject({
      itemId: GLOBAL_ITEM_ID,
      rawText: null,
      quantity: 1,
      unit: Unit.KG,
      isFreeQuantity: false,
      notes: 'à chair ferme',
      usedInSteps: [0],
      displayOrder: 0,
    });
  });

  it('démappe les articles privés au foyer et conserve leur nom dans rawText', () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.ingredients[1]).toMatchObject({
      itemId: null,
      rawText: 'Crème de la ferme du coin',
      quantity: 200,
      unit: Unit.ML,
      displayOrder: 1,
    });
  });

  it("numérote displayOrder dans l'ordre des ingrédients source", () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.ingredients.map(i => i.displayOrder)).toEqual([0, 1]);
  });

  it('copie les ingrédients à quantité libre sans quantité', () => {
    const source = makeSource({
      ingredients: [
        {
          itemId: GLOBAL_ITEM_ID,
          quantity: null,
          unit: Unit.PINCH,
          isFreeQuantity: true,
          notes: null,
          usedInSteps: [],
          item: { id: GLOBAL_ITEM_ID, name: 'Sel', householdId: null },
        },
      ],
    });

    const built = buildCatalogRecipeFromRecipe(source, { authorUserId: AUTHOR_ID });

    expect(built.ingredients[0]).toMatchObject({
      itemId: GLOBAL_ITEM_ID,
      quantity: null,
      unit: Unit.PINCH,
      isFreeQuantity: true,
    });
  });

  it('recopie la traçabilité des recettes importées', () => {
    const source = makeSource({
      sourceUrl: 'https://www.marmiton.org/recettes/gratin.aspx',
      sourceDomain: 'marmiton.org',
    });

    const built = buildCatalogRecipeFromRecipe(source, { authorUserId: AUTHOR_ID });

    expect(built.recipe.sourceUrl).toBe('https://www.marmiton.org/recettes/gratin.aspx');
    expect(built.recipe.sourceDomain).toBe('marmiton.org');
  });

  it("modifier la recette perso après la copie n'altère pas la version catalogue", () => {
    const source = makeSource();
    const built = buildCatalogRecipeFromRecipe(source, { authorUserId: AUTHOR_ID });

    // Le foyer continue à faire vivre sa recette privée.
    source.title = 'Gratin dauphinois v2';
    source.tags.push('rapide');
    source.instructions[0].text = 'Ne pas éplucher, finalement.';
    source.instructions.push({ text: 'Servir.', duration: null });
    source.ingredients[0].quantity = 99;
    source.ingredients[0].usedInSteps.push(1);
    source.ingredients.push({
      itemId: GLOBAL_ITEM_ID,
      quantity: 3,
      unit: Unit.PIECE,
      isFreeQuantity: false,
      notes: null,
      usedInSteps: [],
      item: { id: GLOBAL_ITEM_ID, name: 'Oignon', householdId: null },
    });

    expect(built.recipe.title).toBe('Gratin dauphinois');
    expect(built.recipe.tags).toEqual(['gratin', 'hiver']);
    expect(built.recipe.instructions).toEqual([
      { text: 'Éplucher les pommes de terre.', duration: 10 },
      { text: 'Enfourner.', duration: 60 },
    ]);
    expect(built.ingredients).toHaveLength(2);
    expect(built.ingredients[0].quantity).toBe(1);
    expect(built.ingredients[0].usedInSteps).toEqual([0]);
  });

  it('accepte une recette sans ingrédient', () => {
    const built = buildCatalogRecipeFromRecipe(makeSource({ ingredients: [] }), {
      authorUserId: AUTHOR_ID,
    });

    expect(built.ingredients).toEqual([]);
  });
});
