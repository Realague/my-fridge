import { describe, expect, it } from 'vitest';
import { IngredientMatchingService } from '../../IngredientMatchingService';

/**
 * Jeu de tests FR du normaliseur d'ingrédients (critère d'acceptation :
 * ≥ 90 % des lignes correctement séparées en {quantity, unit, name}).
 * Chaque cas est vérifié individuellement ET le taux global est mesuré.
 */

const service = new IngredientMatchingService();

interface Case {
  raw: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  free?: boolean;
}

const FR_CASES: Case[] = [
  // Unités métriques
  { raw: '200 g de farine', quantity: 200, unit: 'g', name: 'farine' },
  { raw: '1 kg de pommes de terre', quantity: 1, unit: 'kg', name: 'pommes de terre' },
  { raw: '400 ml de lait de coco', quantity: 400, unit: 'ml', name: 'lait de coco' },
  { raw: '25 cl de crème liquide', quantity: 25, unit: 'cl', name: 'crème liquide' },
  { raw: '1 l de lait', quantity: 1, unit: 'l', name: 'lait' },
  { raw: '1,5 l d\'eau', quantity: 1.5, unit: 'l', name: 'eau' },
  { raw: '1.5 kg de tomates', quantity: 1.5, unit: 'kg', name: 'tomates' },
  { raw: '500 grammes de sucre', quantity: 500, unit: 'g', name: 'sucre' },

  // Unités « cuisine »
  { raw: '2 c. à soupe d\'huile d\'olive', quantity: 2, unit: 'tbsp', name: 'huile d\'olive' },
  { raw: '1 c. à café de curcuma', quantity: 1, unit: 'tsp', name: 'curcuma' },
  { raw: '1 cuillère à soupe de miel', quantity: 1, unit: 'tbsp', name: 'miel' },
  { raw: '2 cuillères à café de cannelle', quantity: 2, unit: 'tsp', name: 'cannelle' },
  { raw: '1 c à soupe de farine', quantity: 1, unit: 'tbsp', name: 'farine' },
  { raw: '2 c.à.s de sucre', quantity: 2, unit: 'tbsp', name: 'sucre' },
  { raw: '3 pincées de sel', quantity: 3, unit: 'pinch', name: 'sel', free: true },
  { raw: '1 verre de vin blanc', quantity: 240, unit: 'ml', name: 'vin blanc' },
  { raw: '1 sachet de levure', quantity: 1, unit: 'piece', name: 'levure' },
  { raw: '2 gousses d\'ail', quantity: 2, unit: 'piece', name: 'ail' },
  { raw: '4 tranches de jambon', quantity: 4, unit: 'piece', name: 'jambon' },
  { raw: '1 botte de radis', quantity: 1, unit: 'piece', name: 'radis' },

  // Fractions et quantités vagues
  { raw: '1/2 citron', quantity: 0.5, unit: null, name: 'citron' },
  { raw: '½ poivron rouge', quantity: 0.5, unit: null, name: 'poivron rouge' },
  { raw: '¾ de litre de lait', quantity: 0.75, unit: 'l', name: 'lait' },
  { raw: '1 ½ oignon', quantity: 1.5, unit: null, name: 'oignon' },
  { raw: '1 1/2 pomme', quantity: 1.5, unit: null, name: 'pomme' },
  { raw: '1 à 2 courgettes', quantity: 1.5, unit: null, name: 'courgettes' },
  { raw: 'quelques brins de ciboulette', quantity: null, unit: 'piece', name: 'ciboulette', free: true },
  { raw: 'un peu de persil', quantity: null, unit: 'piece', name: 'persil', free: true },
  { raw: 'parmesan à volonté', quantity: null, unit: 'piece', name: 'parmesan', free: true },

  // Nettoyage du de/d' après la quantité
  { raw: '3 oignons', quantity: 3, unit: null, name: 'oignons' },
  { raw: '250 g de beurre doux', quantity: 250, unit: 'g', name: 'beurre doux' },
  { raw: '10 cl de vin blanc sec', quantity: 10, unit: 'cl', name: 'vin blanc sec' },
  { raw: '1 boîte de tomates pelées', quantity: 1, unit: 'piece', name: 'tomates pelées' },

  // Sans quantité
  { raw: 'sel', quantity: null, unit: 'pinch', name: 'sel', free: true },
  { raw: 'sel, poivre', quantity: null, unit: 'pinch', name: 'sel, poivre', free: true },
  { raw: 'une pincée de sel', quantity: null, unit: 'pinch', name: 'sel', free: true },
  { raw: '1 filet d\'huile d\'olive', quantity: 1, unit: 'drizzle', name: 'huile d\'olive', free: true },
  { raw: '1 noix de beurre', quantity: 1, unit: 'knob', name: 'beurre', free: true },
  { raw: '2 oeufs', quantity: 2, unit: null, name: 'oeufs' },
  { raw: '6 œufs', quantity: 6, unit: null, name: 'œufs' },
];

function caseMatches(expected: Case): boolean {
  const parsed = service.parseIngredient(expected.raw);
  const quantityOk =
    expected.quantity === null
      ? parsed.quantity === null
      : parsed.quantity !== null && Math.abs(parsed.quantity - expected.quantity) < 0.01;
  return quantityOk && parsed.unit === expected.unit && parsed.itemName === expected.name;
}

describe('normaliseur d\'ingrédients FR', () => {
  for (const expected of FR_CASES) {
    it(`parse « ${expected.raw} »`, () => {
      const parsed = service.parseIngredient(expected.raw);
      if (expected.quantity === null) {
        expect(parsed.quantity).toBeNull();
      } else {
        expect(parsed.quantity).toBeCloseTo(expected.quantity, 2);
      }
      expect(parsed.unit).toBe(expected.unit);
      expect(parsed.itemName).toBe(expected.name);
      if (expected.free !== undefined) {
        expect(parsed.isFreeQuantity).toBe(expected.free);
      }
      expect(parsed.originalText).toBe(expected.raw);
    });
  }

  it('atteint au moins 90 % de réussite sur le jeu de tests', () => {
    const passed = FR_CASES.filter(caseMatches).length;
    const rate = passed / FR_CASES.length;
    expect(rate).toBeGreaterThanOrEqual(0.9);
  });

  it('ne fait jamais échouer l\'import : lignes non parsables → raw conservé', () => {
    const oddballs = [
      '',
      '   ',
      '🌶️🌶️🌶️',
      'zeste d\'un citron non traité (bio de préférence)',
      '≈ 3 poignées de roquette ou autre salade au choix !!!',
    ];
    for (const raw of oddballs) {
      const parsed = service.parseIngredient(raw);
      expect(parsed).toBeDefined();
      expect(parsed.originalText).toBe(raw.trim());
      // La chaîne brute reste disponible pour l'écran de vérification.
      expect(typeof parsed.itemName).toBe('string');
    }
  });
});
