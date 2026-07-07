import { describe, expect, it } from 'vitest';
import { parseRecipeYield } from '../yieldParser';

describe('parseRecipeYield', () => {
  it('accepts plain numbers', () => {
    expect(parseRecipeYield(4)).toBe(4);
    expect(parseRecipeYield(6.4)).toBe(6);
  });

  it('extracts the integer from French text', () => {
    expect(parseRecipeYield('4 personnes')).toBe(4);
    expect(parseRecipeYield('Pour 6 parts')).toBe(6);
    expect(parseRecipeYield('8 à 10 portions')).toBe(8);
  });

  it('handles arrays mixing formats', () => {
    expect(parseRecipeYield(['6', '6 personnes'])).toBe(6);
    expect(parseRecipeYield([])).toBeNull();
  });

  it('handles QuantitativeValue objects', () => {
    expect(parseRecipeYield({ '@type': 'QuantitativeValue', value: 12 })).toBe(12);
  });

  it('returns null when no integer can be extracted', () => {
    expect(parseRecipeYield('une douzaine')).toBeNull();
    expect(parseRecipeYield('')).toBeNull();
    expect(parseRecipeYield(undefined)).toBeNull();
    expect(parseRecipeYield(null)).toBeNull();
  });

  it('rejects implausible values', () => {
    expect(parseRecipeYield(0)).toBeNull();
    expect(parseRecipeYield('4000 personnes')).toBeNull();
    expect(parseRecipeYield(-3)).toBeNull();
  });
});
