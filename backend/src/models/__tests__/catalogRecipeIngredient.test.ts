import { describe, expect, it } from 'vitest';
import { CatalogRecipeIngredient } from '../CatalogRecipeIngredient';
import { Unit } from '../../types/enums';

const RECIPE_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';

describe('CatalogRecipeIngredient validations', () => {
  it('accepte un ingrédient mappé sur un article du catalogue', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: 200,
      unit: Unit.G,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).resolves.toBeDefined();
  });

  it("accepte un ingrédient non mappé qui n'a qu'un rawText", async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: null,
      rawText: '2 branches de céleri du jardin',
      quantity: 2,
      unit: Unit.PIECE,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).resolves.toBeDefined();
  });

  it('refuse un ingrédient sans itemId ni rawText', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: null,
      rawText: null,
      quantity: 1,
      unit: Unit.PIECE,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).rejects.toThrow(/itemId or rawText/);
  });

  it('refuse une quantité absente quand isFreeQuantity est faux', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: null,
      unit: Unit.G,
      isFreeQuantity: false,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).rejects.toThrow(/quantity is required/);
  });

  it('accepte une quantité absente quand isFreeQuantity est vrai', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: null,
      unit: Unit.PINCH,
      isFreeQuantity: true,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).resolves.toBeDefined();
  });

  it('refuse une unité gestuelle sans isFreeQuantity', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: 1,
      unit: Unit.PINCH,
      isFreeQuantity: false,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).rejects.toThrow(/requires isFreeQuantity/);
  });
});
