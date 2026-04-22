'use strict';

/**
 * Migrates user data for units removed or restricted by the unit system overhaul:
 *
 *   - 'cup'    → 'ml'    (quantity × 240)
 *   - 'dozen'  → 'piece' (quantity × 12)
 *   - 'bunch'  → 'piece' (quantity preserved)
 *   - 'pack'   → 'piece' (quantity preserved — packs are now treated as pieces)
 *   - 'serving'→ 'piece' (conservative; cooked_meal items will handle 'serving'
 *                        again when the batch-cooking feature ships)
 *   - 'other'  → category default_unit of the related item, falling back to 'piece'
 *
 * Applies to every table that stores a unit on user data:
 *   - stored_items (column `unit`, camelCase `itemId` for join)
 *   - shopping_items (column `unit`, snake_case `item_id` for join)
 *   - recipe_ingredients (column `unit`, camelCase `itemId` for join)
 *   - item_minimums (column `minimumUnit`, camelCase `itemId` for join)
 *
 * Also rewrites catalog item unit fields:
 *   - items.defaultUnit: replace any removed unit with category default
 *   - items.availableUnits (JSON): drop removed units, keep at least one fallback
 *
 * IMPORTANT: Postgres creates a separate enum type per column (enum_<table>_<col>)
 *   and the historical values differ from table to table. Trying to do
 *   `WHERE unit = 'serving'` on an enum type that never had 'serving' raises
 *   `invalid input value for enum` (code 22P02). We therefore resolve each
 *   enum's label set up front and only run an UPDATE when the source value is
 *   actually a member of the target enum.
 *
 * Not reversible.
 */

// Defaults per category for "other" -> concrete unit fallback. Mirrors the
// logic in backend/src/utils/itemUnitMapper.ts getUnitsForCategory().
const CATEGORY_DEFAULTS = {
  beverages: 'ml',
  canned: 'piece',
  cleaning_products: 'ml',
  condiments: 'g',
  dairy: 'g',
  fish: 'g',
  frozen: 'piece',
  fruits: 'piece',
  grains: 'g',
  meal: 'piece',
  meat: 'g',
  other: 'piece',
  preparation: 'g',
  seafood: 'g',
  snacks: 'g',
  spices: 'g',
  vegetables: 'piece',
  cleaning: 'ml',
};

// Simple unit swaps (no per-item lookup needed). Applied in order.
const SIMPLE_REMAPS = [
  { from: 'cup', to: 'ml', qtyMultiplier: 240 },
  { from: 'dozen', to: 'piece', qtyMultiplier: 12 },
  { from: 'bunch', to: 'piece', qtyMultiplier: 1 },
  { from: 'pack', to: 'piece', qtyMultiplier: 1 },
  { from: 'serving', to: 'piece', qtyMultiplier: 1 },
];

// `serving` is handled separately: kept for `items` with category `meal`, removed elsewhere.
const REMOVED_UNITS_FOR_CATALOG = ['cup', 'dozen', 'bunch', 'pack', 'other'];

/**
 * Returns the set of enum labels defined for a given Postgres enum type.
 * The enum type name is deterministic: `enum_<table>_<column>`.
 */
async function getEnumLabels(queryInterface, enumTypeName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT enumlabel FROM pg_enum
     WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = :typname);`,
    { replacements: { typname: enumTypeName }, transaction }
  );
  return new Set(rows.map(r => r.enumlabel));
}

function enumTypeNameFor(table, column) {
  return `enum_${table}_${column}`;
}

/**
 * Run SIMPLE_REMAPS on (table, unitCol, qtyCol). Skips any remap whose "from"
 * value isn't part of the column's enum — otherwise Postgres would fail with
 * 22P02 while casting the literal to the enum type.
 */
async function applySimpleRemaps(queryInterface, table, unitCol, qtyCol, transaction) {
  const labels = await getEnumLabels(queryInterface, enumTypeNameFor(table, unitCol), transaction);
  for (const remap of SIMPLE_REMAPS) {
    if (!labels.has(remap.from)) continue;
    if (!labels.has(remap.to)) {
      // Target value missing is unexpected — skip rather than crash so the
      // rest of the migration still lands.
      continue;
    }
    const qtyUpdate = remap.qtyMultiplier === 1
      ? ''
      : `, "${qtyCol}" = "${qtyCol}" * ${remap.qtyMultiplier}`;
    await queryInterface.sequelize.query(
      `UPDATE "${table}" SET "${unitCol}" = '${remap.to}'${qtyUpdate} WHERE "${unitCol}" = '${remap.from}';`,
      { transaction }
    );
  }
}

/**
 * Remap 'other' rows to their item's category default unit (or 'piece' as
 * fallback). Only runs when the enum actually contains 'other'.
 *
 * `categoryLabels` is the set of labels valid in `enum_items_category`; we skip
 * categories not present there to avoid Postgres 22P02 casting errors.
 */
async function applyOtherRemap(queryInterface, table, unitCol, itemFkCol, transaction, categoryLabels) {
  const labels = await getEnumLabels(queryInterface, enumTypeNameFor(table, unitCol), transaction);
  if (!labels.has('other')) return;

  for (const [category, defaultUnit] of Object.entries(CATEGORY_DEFAULTS)) {
    if (!labels.has(defaultUnit)) continue;
    if (!categoryLabels.has(category)) continue;
    await queryInterface.sequelize.query(
      `UPDATE "${table}" SET "${unitCol}" = '${defaultUnit}'
         WHERE "${unitCol}" = 'other'
           AND "${itemFkCol}" IN (SELECT "id" FROM "items" WHERE "category" = '${category}');`,
      { transaction }
    );
  }

  // Safety net for rows whose item no longer exists / unmapped category.
  if (labels.has('piece')) {
    await queryInterface.sequelize.query(
      `UPDATE "${table}" SET "${unitCol}" = 'piece' WHERE "${unitCol}" = 'other';`,
      { transaction }
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Resolve enum_items_category labels up front — `cleaning` vs
      // `cleaning_products` and other legacy aliases in CATEGORY_DEFAULTS may
      // not exist in the live enum, which would otherwise trip Postgres 22P02.
      const categoryLabels = await getEnumLabels(
        queryInterface,
        enumTypeNameFor('items', 'category'),
        transaction
      );

      // ======================================================
      // 1. User data — stored_items (unit, itemId)
      // ======================================================
      await applySimpleRemaps(queryInterface, 'stored_items', 'unit', 'quantity', transaction);
      await applyOtherRemap(queryInterface, 'stored_items', 'unit', 'itemId', transaction, categoryLabels);

      // ======================================================
      // 2. User data — shopping_items (unit, item_id)
      // ======================================================
      await applySimpleRemaps(queryInterface, 'shopping_items', 'unit', 'quantity', transaction);
      await applyOtherRemap(queryInterface, 'shopping_items', 'unit', 'item_id', transaction, categoryLabels);

      // ======================================================
      // 3. User data — recipe_ingredients (unit, itemId)
      // ======================================================
      await applySimpleRemaps(queryInterface, 'recipe_ingredients', 'unit', 'quantity', transaction);
      await applyOtherRemap(queryInterface, 'recipe_ingredients', 'unit', 'itemId', transaction, categoryLabels);

      // ======================================================
      // 4. User data — item_minimums (minimumUnit, itemId)
      // ======================================================
      await applySimpleRemaps(queryInterface, 'item_minimums', 'minimumUnit', 'minimumQuantity', transaction);
      await applyOtherRemap(queryInterface, 'item_minimums', 'minimumUnit', 'itemId', transaction, categoryLabels);

      // ======================================================
      // 5. Catalog — items.defaultUnit
      // ======================================================
      const defaultUnitLabels = await getEnumLabels(
        queryInterface,
        enumTypeNameFor('items', 'defaultUnit'),
        transaction
      );
      const catalogRemovable = REMOVED_UNITS_FOR_CATALOG.filter(u => defaultUnitLabels.has(u));
      if (catalogRemovable.length > 0) {
        const inList = catalogRemovable.map(u => `'${u}'`).join(',');
        for (const [category, defaultUnit] of Object.entries(CATEGORY_DEFAULTS)) {
          if (!defaultUnitLabels.has(defaultUnit)) continue;
          if (!categoryLabels.has(category)) continue;
          await queryInterface.sequelize.query(
            `UPDATE "items" SET "defaultUnit" = '${defaultUnit}'
               WHERE "defaultUnit" IN (${inList}) AND "category" = '${category}';`,
            { transaction }
          );
        }
        if (defaultUnitLabels.has('piece')) {
          await queryInterface.sequelize.query(
            `UPDATE "items" SET "defaultUnit" = 'piece' WHERE "defaultUnit" IN (${inList});`,
            { transaction }
          );
        }
      }

      // 5b. Catalog — `serving` on defaultUnit: only for category `meal`
      if (defaultUnitLabels.has('piece') && defaultUnitLabels.has('serving')) {
        if (categoryLabels.has('meal')) {
          await queryInterface.sequelize.query(
            `UPDATE "items" SET "defaultUnit" = 'piece' WHERE "defaultUnit" = 'serving' AND "category" != 'meal';`,
            { transaction }
          );
        } else {
          await queryInterface.sequelize.query(
            `UPDATE "items" SET "defaultUnit" = 'piece' WHERE "defaultUnit" = 'serving';`,
            { transaction }
          );
        }
      }

      // ======================================================
      // 6. Catalog — items.availableUnits (JSON list, not enum)
      //    Always safe to rewrite:
      //      - drop cup/dozen/bunch/other
      //      - `serving` only for category `meal` (add it for meal, strip for others)
      //      - guarantee every item has 'piece' available (global invariant:
      //        a catalog item must always be storable/countable as pieces)
      // ======================================================
      const [items] = await queryInterface.sequelize.query(
        `SELECT "id", "availableUnits", "category" FROM "items";`,
        { transaction }
      );

      const removedFromJson = new Set(['cup', 'dozen', 'bunch', 'pack', 'other']);
      for (const row of items) {
        let arr;
        if (!row.availableUnits) {
          arr = [];
        } else {
          try {
            arr = typeof row.availableUnits === 'string'
              ? JSON.parse(row.availableUnits)
              : row.availableUnits;
          } catch {
            arr = [];
          }
        }
        if (!Array.isArray(arr)) arr = [];

        const filtered = arr.filter(u => !removedFromJson.has(u));
        const isMeal = row.category === 'meal';
        let next = isMeal ? filtered : filtered.filter(u => u !== 'serving');
        if (isMeal && !next.includes('serving')) {
          next = [...next, 'serving'];
        }
        const finalUnits = next.includes('piece') ? next : [...next, 'piece'];

        const changed = finalUnits.length !== arr.length
          || finalUnits.some((u, i) => u !== arr[i]);
        if (changed) {
          await queryInterface.sequelize.query(
            `UPDATE "items" SET "availableUnits" = CAST(:units AS json) WHERE "id" = :id;`,
            {
              replacements: { units: JSON.stringify(finalUnits), id: row.id },
              transaction,
            }
          );
        }
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    // Not reversible: original values are lost after the rewrite.
  },
};
