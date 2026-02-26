import { Op } from 'sequelize';
import { Item } from '../models/Item';
import { getReverseTranslationMap, getTranslatedName } from '../i18n/itemTranslations';

export interface ParsedIngredient {
  originalText: string;
  quantity: number | null;
  unit: string | null;
  itemName: string;
}

export interface IngredientMatch {
  itemId: string;
  itemName: string;  // Original name in DB
  translatedName: string;  // Translated name for display
  category: string;
  defaultUnit: string;
  availableUnits: string[];
  confidence: number;  // 0-1 score
}

export interface MatchedIngredient {
  parsed: ParsedIngredient;
  matches: IngredientMatch[];
  bestMatch: IngredientMatch | null;
}

// French unit mappings
const FRENCH_UNIT_MAP: { [key: string]: string } = {
  // Weight
  'g': 'g',
  'gr': 'g',
  'gramme': 'g',
  'grammes': 'g',
  'kg': 'kg',
  'kilo': 'kg',
  'kilos': 'kg',
  'kilogramme': 'kg',
  'kilogrammes': 'kg',
  // Volume
  'ml': 'ml',
  'millilitre': 'ml',
  'millilitres': 'ml',
  'cl': 'cl',
  'centilitre': 'cl',
  'centilitres': 'cl',
  'l': 'l',
  'litre': 'l',
  'litres': 'l',
  // Cooking
  'tasse': 'cup',
  'tasses': 'cup',
  'cs': 'tbsp',
  'c.s': 'tbsp',
  'c.s.': 'tbsp',
  'cuillère à soupe': 'tbsp',
  'cuillères à soupe': 'tbsp',
  'càs': 'tbsp',
  'cc': 'tsp',
  'c.c': 'tsp',
  'c.c.': 'tsp',
  'cuillère à café': 'tsp',
  'cuillères à café': 'tsp',
  'càc': 'tsp',
  // Pieces
  'pièce': 'piece',
  'pièces': 'piece',
  'paquet': 'pack',
  'paquets': 'pack',
  'sachet': 'pack',
  'sachets': 'pack',
  'botte': 'bunch',
  'bottes': 'bunch',
  'bouquet': 'bunch',
  'bouquets': 'bunch',
  'douzaine': 'dozen',
  'douzaines': 'dozen',
  'portion': 'serving',
  'portions': 'serving',
  // Common informal units
  'verre': 'cup',
  'verres': 'cup',
  'bol': 'cup',
  'bols': 'cup',
  'gousse': 'piece',
  'gousses': 'piece',
  'tranche': 'piece',
  'tranches': 'piece',
  'feuille': 'piece',
  'feuilles': 'piece',
  'branche': 'piece',
  'branches': 'piece',
  'brin': 'piece',
  'brins': 'piece',
  'filet': 'piece',
  'filets': 'piece',
  'boîte': 'pack',
  'boîtes': 'pack',
  'pot': 'pack',
  'pots': 'pack',
  'noix': 'piece',
  'pincée': 'other',
  'pincées': 'other',
  'poignée': 'other',
  'poignées': 'other',
};

// Some French tokens can be both units and ingredient names.
// Keep them as ingredient names when they appear alone after quantity (e.g. "3 noix").
const AMBIGUOUS_FRENCH_UNITS = new Set(['noix']);

// Words to remove from ingredient text (French)
const FRENCH_STOP_WORDS = [
  'de', 'd\'', 'du', 'des', 'la', 'le', 'les', 'l\'', 'un', 'une',
  'à', 'au', 'aux', 'en', 'et', 'ou', 'pour', 'avec', 'sans',
  'frais', 'fraîche', 'fraîches', 'frais',
  'environ', 'quelques', 'peu', 'beaucoup',
  'petit', 'petite', 'petits', 'petites',
  'grand', 'grande', 'grands', 'grandes',
  'moyen', 'moyenne', 'moyens', 'moyennes',
  'gros', 'grosse', 'grosses',
  'bien', 'très', 'assez',
  'selon', 'goût', 'facultatif', 'optionnel',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class IngredientMatchingService {
  /**
   * Parse a raw ingredient string to extract quantity, unit and item name
   */
  parseIngredient(text: string): ParsedIngredient {
    const originalText = text.trim();
    let workingText = originalText.toLowerCase();
    
    // Extract quantity (handles fractions, decimals, ranges)
    let quantity: number | null = null;
    
    // Match patterns like "1/2", "1,5", "1.5", "1-2", "200", "1 à 2"
    const quantityPatterns = [
      /^(\d+)\s*[àa-]\s*(\d+)/, // Range: "1 à 2", "1-2"
      /^(\d+)[,.](\d+)/, // Decimal: "1,5", "1.5"
      /^(\d+)\s*\/\s*(\d+)/, // Fraction: "1/2"
      /^(\d+)/, // Simple number: "200"
    ];
    
    for (const pattern of quantityPatterns) {
      const match = workingText.match(pattern);
      if (match) {
        if (pattern.source.includes('[àa-]') && match[1] && match[2]) {
          // Range - take average
          quantity = (parseInt(match[1], 10) + parseInt(match[2], 10)) / 2;
        } else if (pattern.source.includes('[,.]') && match[1] && match[2]) {
          // Decimal
          quantity = parseFloat(match[1] + '.' + match[2]);
        } else if (pattern.source.includes('/') && match[1] && match[2]) {
          // Fraction
          quantity = parseInt(match[1], 10) / parseInt(match[2], 10);
        } else if (match[1]) {
          // Simple number
          quantity = parseInt(match[1], 10);
        }
        workingText = workingText.substring(match[0].length).trim();
        break;
      }
    }
    
    // Extract unit
    let unit: string | null = null;
    const escapedUnitKeys = Object.keys(FRENCH_UNIT_MAP)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    // `\b` is ASCII-only in JS; use a Unicode-aware boundary so accented units
    // like "cuillère(s) à café" are matched before the ingredient name.
    const unitPattern = new RegExp(
      `^(${escapedUnitKeys.join('|')})(?=$|[^\\p{L}\\p{N}_])`,
      'iu'
    );
    const unitMatch = workingText.match(unitPattern);
    if (unitMatch && unitMatch[1]) {
      const normalizedMatch = unitMatch[1].toLowerCase();
      const mappedUnit = FRENCH_UNIT_MAP[normalizedMatch];
      if (mappedUnit) {
        const remainingText = workingText.substring(unitMatch[0].length).trim();
        const shouldKeepAsIngredient =
          AMBIGUOUS_FRENCH_UNITS.has(normalizedMatch) && remainingText.length === 0;

        if (!shouldKeepAsIngredient) {
          unit = mappedUnit;
          workingText = remainingText;
        }
      }
    }
    
    // Remove stop words and clean up
    let itemName = workingText;
    for (const word of FRENCH_STOP_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      itemName = itemName.replace(regex, ' ');
    }
    
    // Clean up multiple spaces and trim
    itemName = itemName.replace(/\s+/g, ' ').trim();
    
    // Remove leading/trailing punctuation
    itemName = itemName.replace(/^[,.\s-]+|[,.\s-]+$/g, '');
    
    return {
      originalText,
      quantity,
      unit,
      itemName,
    };
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const shorter = s1.length < s2.length ? s1 : s2;
      const longer = s1.length < s2.length ? s2 : s1;
      return shorter.length / longer.length;
    }
    
    // Levenshtein distance using two rows for memory efficiency
    const len1 = s1.length;
    const len2 = s2.length;
    
    let prevRow: number[] = [];
    let currRow: number[] = [];
    
    // Initialize rows
    for (let j = 0; j <= len2; j++) {
      prevRow.push(j);
      currRow.push(0);
    }
    
    for (let i = 1; i <= len1; i++) {
      currRow[0] = i;
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        const deletion = (prevRow[j] ?? 0) + 1;
        const insertion = (currRow[j - 1] ?? 0) + 1;
        const substitution = (prevRow[j - 1] ?? 0) + cost;
        currRow[j] = Math.min(deletion, insertion, substitution);
      }
      // Swap rows
      [prevRow, currRow] = [currRow, prevRow];
    }
    
    const distance = prevRow[len2] ?? 0;
    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }
  
  /**
   * Find matching items for a parsed ingredient name
   */
  async findMatches(
    itemName: string,
    language: string = 'fr',
    householdId?: string,
    limit: number = 5
  ): Promise<IngredientMatch[]> {
    if (!itemName || itemName.length < 2) {
      return [];
    }
    
    // Build search conditions
    const whereClause: any = {};
    if (householdId) {
      whereClause.householdId = {
        [Op.or]: [householdId, null]
      };
    }
    
    // Get reverse translation map for the language
    const reverseTranslationMap = getReverseTranslationMap(language);
    
    // Search for items that match either by name or translated name
    const searchConditions: any[] = [
      { name: { [Op.iLike]: `%${itemName}%` } }
    ];
    
    // Find potential nameKeys from translation
    const searchTerm = itemName.toLowerCase();
    const matchingNameKeys: string[] = [];
    for (const [translatedName, nameKey] of Object.entries(reverseTranslationMap)) {
      if (translatedName.includes(searchTerm) || searchTerm.includes(translatedName)) {
        matchingNameKeys.push(nameKey);
      }
    }
    
    if (matchingNameKeys.length > 0) {
      searchConditions.push({
        name: { [Op.in]: matchingNameKeys }
      });
    }
    
    whereClause[Op.or] = searchConditions;
    
    // Fetch potential matches
    const items = await Item.findAll({
      where: whereClause,
      limit: 50, // Get more items to score
    });
    
    // Score and rank matches
    const matches: IngredientMatch[] = [];
    
    for (const item of items) {
      const translatedName = getTranslatedName(item.name, language);
      
      // Calculate similarity scores
      const nameKeyScore = this.calculateSimilarity(itemName, item.name);
      const translatedScore = this.calculateSimilarity(itemName, translatedName);
      
      // Take the best score
      const confidence = Math.max(nameKeyScore, translatedScore);
      
      // Only include if above threshold
      if (confidence >= 0.3) {
        matches.push({
          itemId: item.id,
          itemName: item.name,
          translatedName,
          category: item.category,
          defaultUnit: item.defaultUnit,
          availableUnits: item.availableUnits,
          confidence,
        });
      }
    }
    
    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches.slice(0, limit);
  }
  
  /**
   * Match a list of raw ingredient strings
   */
  async matchIngredients(
    ingredientTexts: string[],
    language: string = 'fr',
    householdId?: string
  ): Promise<MatchedIngredient[]> {
    const results: MatchedIngredient[] = [];
    
    for (const text of ingredientTexts) {
      const parsed = this.parseIngredient(text);
      const matches = await this.findMatches(parsed.itemName, language, householdId);
      
      results.push({
        parsed,
        matches,
        bestMatch: matches.length > 0 ? matches[0] ?? null : null,
      });
    }
    
    return results;
  }
}

