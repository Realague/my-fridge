import { Op } from 'sequelize';
import { Item } from '../models/Item';
import { getReverseTranslationMap, getTranslatedName } from '../i18n/itemTranslations';

export interface ParsedIngredient {
  originalText: string;
  quantity: number | null;
  unit: string | null;
  itemName: string;
  /**
   * True when the ingredient has no precise quantity — e.g. "pincée de sel",
   * "filet d'huile", or a bare "sel, poivre" without any number. Free-quantity
   * ingredients are skipped by stock comparisons and shopping list generation.
   */
  isFreeQuantity: boolean;
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

// Mapping of common French / English tokens to canonical Unit enum values.
// Removed units (cup, dozen, bunch, other) are kept as mapping entries but
// resolved to concrete replacements ahead of time (tasse/verre/bol → ml
// with a multiplier in parseIngredient, bouquet → piece, douzaine → piece
// with quantity × 12).
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
  // Cooking (remaining after 'cup' removal)
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
  // 'pack' was removed from the unit system; containers map to 'piece'.
  'paquet': 'piece',
  'paquets': 'piece',
  'sachet': 'piece',
  'sachets': 'piece',
  // "bouquet" and "botte" are not real storage units anymore — map to 'piece'
  // so recipe parsing gives a usable unit.
  'botte': 'piece',
  'bottes': 'piece',
  'bouquet': 'piece',
  'bouquets': 'piece',
  // "douzaine" is handled specially via DOZEN_TOKENS (quantity × 12 → piece).
  // Common informal measures — mapped to ml with a multiplier (see CUP_TOKENS).
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
  'boîte': 'piece',
  'boîtes': 'piece',
  'pot': 'piece',
  'pots': 'piece',
  // Free-quantity (gestural) units — no numeric quantity.
  'pincée': 'pinch',
  'pincées': 'pinch',
  'pinch': 'pinch',
  'filet': 'drizzle',
  'filets': 'drizzle',
  'drizzle': 'drizzle',
  'splash': 'drizzle',
  'noix': 'knob',   // only when followed by "beurre"/"butter" — see buildKnobRegex
  'poignée': 'pinch',
  'poignées': 'pinch',
};

// Tokens that trigger a volume conversion (to ml, multiplier 240 = 1 US cup).
const CUP_TOKENS = new Set(['tasse', 'tasses', 'verre', 'verres', 'bol', 'bols', 'cup', 'cups']);
// Tokens that trigger a dozen conversion (quantity × 12, unit becomes piece).
const DOZEN_TOKENS = new Set(['douzaine', 'douzaines', 'dozen']);

// Free-quantity canonical units. Their presence forces isFreeQuantity = true.
const FREE_QUANTITY_UNIT_VALUES = new Set(['pinch', 'drizzle', 'knob']);

// Tokens that, when seen alone, strongly suggest a free-quantity ingredient
// even if no quantity number is found. Values are the canonical Unit the
// ingredient should be tagged with.
const FREE_QUANTITY_KEYWORD_PATTERNS: Array<{ regex: RegExp; unit: string }> = [
  // "pincée(s) de", "pinch of", "a pinch"
  { regex: /\b(une\s+)?pinc[ée]es?\b|\bpinch(?:\s+of)?\b/iu, unit: 'pinch' },
  // "filet de", "drizzle of", "splash of"
  { regex: /\b(un\s+)?filets?\b|\bdrizzle(?:\s+of)?\b|\bsplash(?:\s+of)?\b/iu, unit: 'drizzle' },
  // "noix de beurre", "knob of butter", "dab of butter"
  { regex: /\b(une\s+)?noix\s+de\s+beurre\b|\bknob\s+of\s+butter\b|\bdab\s+of\s+butter\b/iu, unit: 'knob' },
];

// When no quantity and no unit is detected, try to infer a gestural unit from
// the ingredient itself (salt/pepper → pinch, oil/vinegar → drizzle, butter → knob).
function inferFreeQuantityUnit(itemName: string): string {
  const lc = itemName.toLowerCase();
  if (/\b(sel|poivre|piment|salt|pepper|chili)\b/u.test(lc)) return 'pinch';
  if (/\b(huile|vinaigre|oil|vinegar)\b/u.test(lc)) return 'drizzle';
  if (/\b(beurre|butter)\b/u.test(lc)) return 'knob';
  return 'piece';
}

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
   * Parse a raw ingredient string to extract quantity, unit, item name, and
   * a free-quantity flag.
   *
   * Detection priority (conservative by design):
   *   1. Explicit numeric quantity present → quantity preserved, unit taken from
   *      FRENCH_UNIT_MAP (tasse/verre/bol → ml×240; douzaine → piece×12). When
   *      the matched unit is gestural ("3 pincées de sel"), `isFreeQuantity = true`
   *      but the count is kept as-is — only stock comparisons are skipped.
   *   2. No numeric quantity but a free-quantity keyword (pincée, filet, noix de
   *      beurre, pinch, drizzle, knob of butter…) is present → `isFreeQuantity = true`,
   *      `quantity = null`, unit from the keyword.
   *   3. No quantity at all (ex: "sel, poivre") → `isFreeQuantity = true`,
   *      `quantity = null`, unit inferred from the ingredient name
   *      (salt/pepper → pinch, oil/vinegar → drizzle, butter → knob, else piece).
   */
  parseIngredient(text: string): ParsedIngredient {
    const originalText = text.trim();
    let workingText = originalText.toLowerCase();

    // ------------------------------------------------------------------
    // Step 1: extract a leading numeric quantity (if any).
    // Handles fractions, decimals, ranges, simple integers.
    // ------------------------------------------------------------------
    let quantity: number | null = null;

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
          quantity = (parseInt(match[1], 10) + parseInt(match[2], 10)) / 2;
        } else if (pattern.source.includes('[,.]') && match[1] && match[2]) {
          quantity = parseFloat(match[1] + '.' + match[2]);
        } else if (pattern.source.includes('/') && match[1] && match[2]) {
          quantity = parseInt(match[1], 10) / parseInt(match[2], 10);
        } else if (match[1]) {
          quantity = parseInt(match[1], 10);
        }
        workingText = workingText.substring(match[0].length).trim();
        break;
      }
    }

    // ------------------------------------------------------------------
    // Step 2: extract a unit token at the current cursor position.
    // ------------------------------------------------------------------
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

    // Also match CUP_TOKENS / DOZEN_TOKENS explicitly (they're not in
    // FRENCH_UNIT_MAP, which now only carries canonical Unit enum values).
    const cupRegex = new RegExp(
      `^(${Array.from(CUP_TOKENS).map(escapeRegExp).join('|')})(?=$|[^\\p{L}\\p{N}_])`,
      'iu'
    );
    const dozenRegex = new RegExp(
      `^(${Array.from(DOZEN_TOKENS).map(escapeRegExp).join('|')})(?=$|[^\\p{L}\\p{N}_])`,
      'iu'
    );

    const cupMatch = workingText.match(cupRegex);
    const dozenMatch = workingText.match(dozenRegex);
    const unitMatch = workingText.match(unitPattern);

    if (cupMatch && cupMatch[1]) {
      // tasse/verre/bol/cup → ml, with *240 multiplier on any explicit quantity.
      unit = 'ml';
      if (quantity !== null) {
        quantity = quantity * 240;
      }
      workingText = workingText.substring(cupMatch[0].length).trim();
    } else if (dozenMatch && dozenMatch[1]) {
      // douzaine/dozen → piece, with *12 multiplier on any explicit quantity.
      unit = 'piece';
      if (quantity !== null) {
        quantity = quantity * 12;
      }
      workingText = workingText.substring(dozenMatch[0].length).trim();
    } else if (unitMatch && unitMatch[1]) {
      const normalizedMatch = unitMatch[1].toLowerCase();
      const mappedUnit = FRENCH_UNIT_MAP[normalizedMatch];
      if (mappedUnit) {
        const remainingText = workingText.substring(unitMatch[0].length).trim();
        const shouldKeepAsIngredient =
          AMBIGUOUS_FRENCH_UNITS.has(normalizedMatch) && remainingText.length === 0;

        // Special case for "noix": only treat as a unit (knob) if followed by
        // "beurre" / "butter". Otherwise keep "noix" as an ingredient name.
        if (normalizedMatch === 'noix') {
          if (/^(de\s+)?(beurre|butter)\b/iu.test(remainingText)) {
            unit = 'knob';
            workingText = remainingText;
          }
          // else: do not consume the token, leave it for ingredient matching.
        } else if (!shouldKeepAsIngredient) {
          unit = mappedUnit;
          workingText = remainingText;
        }
      }
    }

    // ------------------------------------------------------------------
    // Step 3: determine isFreeQuantity.
    // ------------------------------------------------------------------
    let isFreeQuantity = false;

    if (unit && FREE_QUANTITY_UNIT_VALUES.has(unit)) {
      // A gestural unit was detected (pinch/drizzle/knob) — always free quantity.
      // Preserve any explicit count ("3 pincées de sel" → quantity=3): the
      // free-quantity flag means stock/shopping comparisons are skipped, not
      // that an author-supplied number must be discarded.
      isFreeQuantity = true;
    } else if (quantity === null) {
      // No numeric quantity was parsed: look for free-quantity keywords anywhere
      // in the original text, then fall back to inference from the ingredient.
      let keywordHit: string | null = null;
      for (const { regex, unit: kwUnit } of FREE_QUANTITY_KEYWORD_PATTERNS) {
        if (regex.test(originalText.toLowerCase())) {
          keywordHit = kwUnit;
          break;
        }
      }
      if (keywordHit) {
        unit = keywordHit;
        isFreeQuantity = true;
      } else if (!unit) {
        // Truly no quantity and no unit — conservative default: free quantity
        // with a unit inferred from the ingredient context.
        isFreeQuantity = true;
        unit = inferFreeQuantityUnit(workingText);
      }
    }

    // ------------------------------------------------------------------
    // Step 4: clean the remaining text into an item name.
    // ------------------------------------------------------------------
    let itemName = workingText;
    for (const word of FRENCH_STOP_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      itemName = itemName.replace(regex, ' ');
    }

    // Strip trailing free-quantity keywords so the ingredient name stays clean.
    for (const { regex } of FREE_QUANTITY_KEYWORD_PATTERNS) {
      itemName = itemName.replace(regex, ' ');
    }

    itemName = itemName.replace(/\s+/g, ' ').trim();
    itemName = itemName.replace(/^[,.\s-]+|[,.\s-]+$/g, '');

    return {
      originalText,
      quantity,
      unit,
      itemName,
      isFreeQuantity,
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
