import { describe, expect, it } from 'vitest';
import { findStructuredRecipe, isRecipeType } from '../structuredDataExtractor';

const wrap = (body: string) => `<!DOCTYPE html><html><head>${body}</head><body></body></html>`;
const jsonLd = (payload: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;

describe('isRecipeType', () => {
  it('matches plain strings, arrays and prefixed forms', () => {
    expect(isRecipeType('Recipe')).toBe(true);
    expect(isRecipeType(['Recipe', 'Thing'])).toBe(true);
    expect(isRecipeType(['Thing', 'Recipe'])).toBe(true);
    expect(isRecipeType('schema:Recipe')).toBe(true);
    expect(isRecipeType('https://schema.org/Recipe')).toBe(true);
    expect(isRecipeType('recipe')).toBe(true);
  });

  it('rejects non-recipe types', () => {
    expect(isRecipeType('Article')).toBe(false);
    expect(isRecipeType(['WebPage', 'Article'])).toBe(false);
    expect(isRecipeType(undefined)).toBe(false);
    expect(isRecipeType('RecipeCollection')).toBe(false);
  });
});

describe('findStructuredRecipe — JSON-LD', () => {
  it('finds a top-level Recipe object', () => {
    const html = wrap(jsonLd({ '@type': 'Recipe', name: 'Tarte', recipeIngredient: ['1 pomme'] }));
    const result = findStructuredRecipe(html);
    expect(result?.method).toBe('json-ld');
    expect(result?.node.name).toBe('Tarte');
  });

  it('finds a Recipe with @type as an array', () => {
    const html = wrap(jsonLd({ '@type': ['Recipe', 'CreativeWork'], name: 'Gratin' }));
    expect(findStructuredRecipe(html)?.node.name).toBe('Gratin');
  });

  it('finds a Recipe inside a @graph', () => {
    const html = wrap(
      jsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', name: 'Site' },
          { '@type': 'Recipe', name: 'Quiche', recipeIngredient: ['3 oeufs'] },
        ],
      })
    );
    expect(findStructuredRecipe(html)?.node.name).toBe('Quiche');
  });

  it('finds a Recipe nested as mainEntity of a WebPage', () => {
    const html = wrap(
      jsonLd({ '@type': 'WebPage', mainEntity: { '@type': 'Recipe', name: 'Soupe' } })
    );
    expect(findStructuredRecipe(html)?.node.name).toBe('Soupe');
  });

  it('handles a top-level array of entities', () => {
    const html = wrap(
      jsonLd([{ '@type': 'BreadcrumbList' }, { '@type': 'Recipe', name: 'Curry' }])
    );
    expect(findStructuredRecipe(html)?.node.name).toBe('Curry');
  });

  it('scans multiple ld+json blocks and skips malformed ones', () => {
    const html = wrap(
      `<script type="application/ld+json">{not json at all]</script>` +
        jsonLd({ '@type': 'NewsArticle', headline: 'x' }) +
        jsonLd({ '@type': 'Recipe', name: 'Pot-au-feu', recipeIngredient: ['1 carotte'] })
    );
    expect(findStructuredRecipe(html)?.node.name).toBe('Pot-au-feu');
  });

  it('prefers the richest Recipe when several are present', () => {
    const html = wrap(
      jsonLd({ '@type': 'Recipe', name: 'Suggestion' }) +
        jsonLd({
          '@type': 'Recipe',
          name: 'Plat principal',
          recipeIngredient: ['a', 'b'],
          recipeInstructions: [{ '@type': 'HowToStep', text: 'cuire' }],
        })
    );
    expect(findStructuredRecipe(html)?.node.name).toBe('Plat principal');
  });

  it('recovers from raw control characters inside JSON strings', () => {
    const payload = `{"@type":"Recipe","name":"Tarte\nnormande","recipeIngredient":["2 pommes"]}`;
    const html = wrap(`<script type="application/ld+json">${payload}</script>`);
    expect(findStructuredRecipe(html)?.node.name).toContain('Tarte');
  });
});

describe('findStructuredRecipe — microdata & RDFa', () => {
  it('rebuilds a node from microdata markup', () => {
    const html = `<!DOCTYPE html><html><body>
      <div itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Ratatouille</h1>
        <meta itemprop="prepTime" content="PT20M" />
        <img itemprop="image" src="/photo.jpg" />
        <li itemprop="recipeIngredient">2 aubergines</li>
        <li itemprop="recipeIngredient">3 courgettes</li>
        <span itemprop="recipeYield">6 personnes</span>
        <p itemprop="recipeInstructions">Couper les légumes.</p>
      </div></body></html>`;
    const result = findStructuredRecipe(html);
    expect(result?.method).toBe('microdata');
    expect(result?.node.name).toBe('Ratatouille');
    expect(result?.node.recipeIngredient).toEqual(['2 aubergines', '3 courgettes']);
    expect(result?.node.prepTime).toBe('PT20M');
  });

  it('falls back to RDFa when no JSON-LD nor microdata exists', () => {
    const html = `<!DOCTYPE html><html><body>
      <div vocab="https://schema.org/" typeof="Recipe">
        <h1 property="name">Flan</h1>
        <li property="recipeIngredient">1 l de lait</li>
      </div></body></html>`;
    const result = findStructuredRecipe(html);
    expect(result?.method).toBe('rdfa');
    expect(result?.node.name).toBe('Flan');
  });

  it('returns null when the page has no structured recipe', () => {
    const html = `<!DOCTYPE html><html><body><h1>Blog</h1>${jsonLd({
      '@type': 'Article',
      headline: 'pas une recette',
    })}</body></html>`;
    expect(findStructuredRecipe(html)).toBeNull();
  });
});
