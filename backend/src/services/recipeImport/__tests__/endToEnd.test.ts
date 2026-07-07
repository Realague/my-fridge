import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RecipeImportService } from '../../RecipeImportService';
import { IngredientMatchingService, IngredientMatch } from '../../IngredientMatchingService';
import { NoRecipeFoundError } from '../errors';

/**
 * Tests d'intégration bout-en-bout sur fixtures HTML (pages sauvegardées) :
 * aucun fetch live, aucune base de données. Le matching catalogue est
 * neutralisé (findMatches → []) mais la normalisation des ingrédients est
 * bien la vraie.
 */

/** Matcher réel pour le parsing, sans accès base pour la recherche. */
class OfflineMatcher extends IngredientMatchingService {
  override async findMatches(): Promise<IngredientMatch[]> {
    return [];
  }
}

const service = new RecipeImportService({
  ingredientMatchingService: new OfflineMatcher(),
});

function fixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

describe('import bout-en-bout — fixtures HTML', () => {
  it('Marmiton (JSON-LD + enrichissement DOM) → enregistrement complet', async () => {
    const preview = await service.previewFromHtml(
      fixture('marmiton-poulet-curry.html'),
      'https://www.marmiton.org/recettes/recette_poulet-au-curry_18569.aspx'
    );

    expect(preview.title).toBe('Poulet au curry et lait de coco');
    expect(preview.prepTime).toBe(20);
    expect(preview.cookTime).toBe(30);
    expect(preview.servings).toBe(4);
    expect(preview.ingredients).toHaveLength(8);
    expect(preview.instructions).toHaveLength(5);
    expect(preview.instructions[1]?.duration).toBe(360);
    expect(preview.imageUrl).toContain('93191');
    expect(preview.extractionMethod).toBe('json-ld');

    // Traçabilité
    expect(preview.sourceUrl).toContain('marmiton.org');
    expect(preview.sourceDomain).toBe('marmiton.org');
    expect(new Date(preview.importedAt).getTime()).not.toBeNaN();

    // Enrichissement Marmiton : difficulté DOM + liaison ingrédients/étapes
    expect(preview.difficulty).toBe('Easy');
    expect(preview.ingredientStepMapping[0]).toEqual([0, 1]); // poulet
    expect(preview.ingredientStepMapping[1]).toEqual([2]); // lait de coco
    expect(preview.ingredientStepMapping[5]).toEqual([2]); // riz basmati

    // Normalisation réelle des ingrédients
    const curry = preview.matchedIngredients[4]?.parsed;
    expect(curry?.quantity).toBe(1);
    expect(curry?.unit).toBe('tbsp');

    // Tags issus de category/cuisine/keywords
    expect(preview.tags).toContain('plat principal');
    expect(preview.tags).toContain('asiatique');
  });

  it('@graph + @type tableau + HowToSection → étapes aplaties dans l\'ordre', async () => {
    const preview = await service.previewFromHtml(
      fixture('graph-type-array.html'),
      'https://www.cuisine-test.fr/tarte-aux-pommes'
    );

    expect(preview.title).toBe('Tarte aux pommes grand-mère');
    expect(preview.instructions.map((s) => s.text)).toEqual([
      'Étaler la pâte dans un moule beurré.',
      'Piquer le fond avec une fourchette.',
      'Éplucher et couper les pommes en lamelles.',
      'Disposer sur la pâte, saupoudrer de sucre et enfourner 35 minutes à 180°C.',
    ]);
    expect(preview.cookTime).toBe(90); // PT1H30M
    expect(preview.servings).toBe(6); // recipeYield numérique
    // Image relative résolue contre l'URL source
    expect(preview.imageUrl).toBe('https://www.cuisine-test.fr/images/tarte-pommes.jpg');
    expect(preview.sourceDomain).toBe('cuisine-test.fr');
  });

  it('instructions en chaîne unique → découpage en étapes', async () => {
    const preview = await service.previewFromHtml(
      fixture('string-instructions.html'),
      'https://www.exemple.fr/vinaigrette'
    );

    expect(preview.instructions.map((s) => s.text)).toEqual([
      'Mélanger la moutarde et le vinaigre.',
      "Ajouter l'huile en fouettant.",
      'Saler selon le goût.',
    ]);
    expect(preview.servings).toBe(2); // "Pour 2 personnes"
  });

  it('microdata sans JSON-LD → extraction complète', async () => {
    const preview = await service.previewFromHtml(
      fixture('microdata-only.html'),
      'https://www.exemple.fr/gratin'
    );

    expect(preview.extractionMethod).toBe('microdata');
    expect(preview.title).toBe('Gratin dauphinois');
    expect(preview.prepTime).toBe(15);
    expect(preview.cookTime).toBe(60);
    expect(preview.servings).toBe(6);
    expect(preview.ingredients).toHaveLength(4);
    expect(preview.instructions).toHaveLength(3);
  });

  it('aucune donnée structurée → fallback HTML, événement logué', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const preview = await service.previewFromHtml(
        fixture('no-structured-data.html'),
        'https://blog.example.net/salade-chevre-chaud'
      );

      expect(preview.extractionMethod).toBe('html-fallback');
      expect(preview.title).toBe('Salade de chèvre chaud');
      expect(preview.ingredients).toContain('2 crottins de chèvre');
      expect(preview.instructions.length).toBeGreaterThanOrEqual(3);
      expect(preview.imageUrl).toBe('https://blog.example.net/photos/salade.jpg');

      const missLogged = warnSpy.mock.calls.some((args) =>
        String(args[0]).includes('structured-data miss')
      );
      expect(missLogged).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('page sans recette → NoRecipeFoundError (pas de faux positif)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(
        service.previewFromHtml(fixture('nothing-at-all.html'), 'https://www.exemple.fr/accueil')
      ).rejects.toBeInstanceOf(NoRecipeFoundError);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
