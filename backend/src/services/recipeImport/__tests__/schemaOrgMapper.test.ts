import { describe, expect, it } from 'vitest';
import { mapSchemaOrgRecipe, normalizeInstructions, extractImageUrl } from '../schemaOrgMapper';

const URL_SOURCE = 'https://www.example.org/recettes/tarte.html';

describe('normalizeInstructions — the three published forms', () => {
  it('form 1: array of HowToStep objects', () => {
    const steps = normalizeInstructions([
      { '@type': 'HowToStep', text: 'Préchauffer le four.' },
      { '@type': 'HowToStep', text: 'Étaler la pâte.', performTime: 'PT5M' },
    ]);
    expect(steps).toEqual([
      { text: 'Préchauffer le four.', duration: null },
      { text: 'Étaler la pâte.', duration: 300 },
    ]);
  });

  it('form 2: a single string, split on newlines or numbering', () => {
    expect(normalizeInstructions('Couper.\nCuire.\nServir.')).toEqual([
      { text: 'Couper.', duration: null },
      { text: 'Cuire.', duration: null },
      { text: 'Servir.', duration: null },
    ]);
    const numbered = normalizeInstructions('1. Couper les oignons. 2. Faire revenir. 3. Servir chaud.');
    expect(numbered.map((s) => s.text)).toEqual([
      'Couper les oignons.',
      'Faire revenir.',
      'Servir chaud.',
    ]);
  });

  it('form 3: HowToSection groups, flattened in order', () => {
    const steps = normalizeInstructions([
      {
        '@type': 'HowToSection',
        name: 'La pâte',
        itemListElement: [
          { '@type': 'HowToStep', text: 'Mélanger farine et beurre.' },
          { '@type': 'HowToStep', text: 'Laisser reposer.' },
        ],
      },
      {
        '@type': 'HowToSection',
        name: 'La garniture',
        itemListElement: [{ '@type': 'HowToStep', text: 'Couper les pommes.' }],
      },
    ]);
    expect(steps.map((s) => s.text)).toEqual([
      'Mélanger farine et beurre.',
      'Laisser reposer.',
      'Couper les pommes.',
    ]);
  });

  it('handles plain-string arrays and steps using name instead of text', () => {
    expect(normalizeInstructions(['Couper', 'Cuire']).map((s) => s.text)).toEqual([
      'Couper',
      'Cuire',
    ]);
    expect(normalizeInstructions([{ '@type': 'HowToStep', name: 'Émincer' }])[0]?.text).toBe(
      'Émincer'
    );
  });

  it('strips embedded HTML from step texts', () => {
    expect(normalizeInstructions('Faire <b>dorer</b> &agrave; feu vif')[0]?.text).toBe(
      'Faire dorer à feu vif'
    );
  });

  it('never throws on absent or weird input', () => {
    expect(normalizeInstructions(undefined)).toEqual([]);
    expect(normalizeInstructions(null)).toEqual([]);
    expect(normalizeInstructions(42)).toEqual([]);
    expect(normalizeInstructions({})).toEqual([]);
  });
});

describe('extractImageUrl', () => {
  it('accepts string, array and ImageObject forms', () => {
    expect(extractImageUrl('https://img.example.org/a.jpg', URL_SOURCE)).toBe(
      'https://img.example.org/a.jpg'
    );
    expect(extractImageUrl(['https://img.example.org/b.jpg', 'x'], URL_SOURCE)).toBe(
      'https://img.example.org/b.jpg'
    );
    expect(
      extractImageUrl({ '@type': 'ImageObject', url: 'https://img.example.org/c.jpg' }, URL_SOURCE)
    ).toBe('https://img.example.org/c.jpg');
    expect(
      extractImageUrl([{ '@type': 'ImageObject', contentUrl: '/photos/d.jpg' }], URL_SOURCE)
    ).toBe('https://www.example.org/photos/d.jpg');
  });

  it('returns null when absent', () => {
    expect(extractImageUrl(undefined, URL_SOURCE)).toBeNull();
    expect(extractImageUrl([], URL_SOURCE)).toBeNull();
  });
});

describe('mapSchemaOrgRecipe', () => {
  it('maps a complete node', () => {
    const recipe = mapSchemaOrgRecipe(
      {
        '@type': 'Recipe',
        name: 'Poulet au curry',
        description: 'Un classique <em>express</em>.',
        recipeIngredient: ['4 blancs de poulet', '400 ml de lait de coco'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Tout cuire.' }],
        prepTime: 'PT20M',
        cookTime: 'PT30M',
        recipeYield: '4 personnes',
        image: ['https://img.example.org/poulet.jpg'],
        recipeCategory: 'Plat principal',
        recipeCuisine: ['Indienne'],
        keywords: 'curry, coco, facile',
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', reviewCount: '213' },
        nutrition: { '@type': 'NutritionInformation', calories: '450 kcal' },
      },
      URL_SOURCE,
      'json-ld'
    );

    expect(recipe.title).toBe('Poulet au curry');
    expect(recipe.description).toBe('Un classique express.');
    expect(recipe.rawIngredients).toHaveLength(2);
    expect(recipe.prepMin).toBe(20);
    expect(recipe.cookMin).toBe(30);
    expect(recipe.totalMin).toBe(50);
    expect(recipe.servings).toBe(4);
    expect(recipe.imageUrl).toBe('https://img.example.org/poulet.jpg');
    expect(recipe.categories).toEqual(['Plat principal']);
    expect(recipe.cuisines).toEqual(['Indienne']);
    expect(recipe.keywords).toEqual(['curry', 'coco', 'facile']);
    expect(recipe.rating).toBe(4.7);
    expect(recipe.ratingCount).toBe(213);
    expect(recipe.nutrition).toEqual({ calories: '450 kcal' });
    expect(recipe.sourceUrl).toBe(URL_SOURCE);
    expect(recipe.sourceDomain).toBe('example.org');
    expect(recipe.extractionMethod).toBe('json-ld');
  });

  it('tolerates every optional field being absent', () => {
    const recipe = mapSchemaOrgRecipe({ '@type': 'Recipe', name: 'Minimal' }, URL_SOURCE, 'json-ld');
    expect(recipe.title).toBe('Minimal');
    expect(recipe.description).toBeNull();
    expect(recipe.rawIngredients).toEqual([]);
    expect(recipe.steps).toEqual([]);
    expect(recipe.prepMin).toBeNull();
    expect(recipe.cookMin).toBeNull();
    expect(recipe.totalMin).toBeNull();
    expect(recipe.servings).toBeNull();
    expect(recipe.imageUrl).toBeNull();
    expect(recipe.rating).toBeNull();
    expect(recipe.nutrition).toBeNull();
  });

  it('uses published totalTime over prep+cook when present', () => {
    const recipe = mapSchemaOrgRecipe(
      { '@type': 'Recipe', name: 'X', prepTime: 'PT10M', cookTime: 'PT20M', totalTime: 'PT45M' },
      URL_SOURCE,
      'json-ld'
    );
    expect(recipe.totalMin).toBe(45);
  });

  it('accepts ingredient objects carrying a text property', () => {
    const recipe = mapSchemaOrgRecipe(
      { '@type': 'Recipe', name: 'X', recipeIngredient: [{ text: '2 oeufs' }, '100 g de sucre'] },
      URL_SOURCE,
      'json-ld'
    );
    expect(recipe.rawIngredients).toEqual(['2 oeufs', '100 g de sucre']);
  });
});
