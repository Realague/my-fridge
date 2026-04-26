'use strict';

/**
 * Strips the legacy unit values ('cup', 'dozen', 'bunch', 'pack', 'other') from
 * every Postgres enum type that backs a `unit` column.
 *
 * Postgres does NOT support `ALTER TYPE ... DROP VALUE`, so for each enum we:
 *   1. Build the trimmed label set (current labels minus removed ones).
 *   2. Create a sibling enum type (`<orig>__new`) with the trimmed labels.
 *   3. Defensive UPDATE: remap any leftover rows still carrying a removed
 *      value to 'piece' (cup/dozen/bunch/pack/other → piece). The data
 *      migration 202604211 should already have done this; this is a belt to
 *      avoid an `invalid input value for enum` failure on the cast below.
 *   4. ALTER COLUMN ... TYPE <new> USING (col::text::<new>).
 *   5. DROP TYPE <orig> and RENAME <new> back to <orig>.
 *
 * Tables / columns processed:
 *   - items.defaultUnit            (enum_items_defaultUnit)
 *   - stored_items.unit            (enum_stored_items_unit)
 *   - shopping_items.unit          (enum_shopping_items_unit)
 *   - recipe_ingredients.unit      (enum_recipe_ingredients_unit)
 *   - item_minimums.minimumUnit    (enum_item_minimums_minimumUnit)
 *
 * `items.availableUnits` is a JSON column (not an enum) and was already
 * scrubbed by 202604211, so no enum work is needed there.
 *
 * Not reversible — the labels are gone from the schema after this runs.
 */

const REMOVED = ['cup', 'dozen', 'bunch', 'pack', 'other'];

const TARGETS = [
  { table: 'items',              column: 'defaultUnit'   },
  { table: 'stored_items',       column: 'unit'          },
  { table: 'shopping_items',     column: 'unit'          },
  { table: 'recipe_ingredients', column: 'unit'          },
  { table: 'item_minimums',      column: 'minimumUnit'   },
];

function enumTypeNameFor(table, column) {
  return `enum_${table}_${column}`;
}

async function getEnumLabels(queryInterface, enumTypeName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = :typname)
       ORDER BY enumsortorder;`,
    { replacements: { typname: enumTypeName }, transaction }
  );
  return rows.map(r => r.enumlabel);
}

async function tableHasColumn(queryInterface, table, column, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
       WHERE table_name = :table AND column_name = :column;`,
    { replacements: { table, column }, transaction }
  );
  return rows.length > 0;
}

/**
 * Returns the column's DEFAULT expression (e.g. `'piece'::"enum_..."`) or null.
 * We need this to drop the default before the type swap (Postgres can't cast
 * an enum-typed default to a different enum type) and re-attach it after.
 */
async function getColumnDefault(queryInterface, table, column, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT column_default FROM information_schema.columns
       WHERE table_name = :table AND column_name = :column;`,
    { replacements: { table, column }, transaction }
  );
  return rows.length > 0 ? rows[0].column_default : null;
}

/**
 * Extracts the literal label from a DEFAULT expression like
 * `'piece'::"enum_items_defaultUnit"` → `'piece'`. Returns null if the
 * expression isn't a simple cast literal we can safely re-emit against the
 * trimmed enum.
 */
function extractDefaultLiteral(defaultExpr) {
  if (!defaultExpr) return null;
  const m = defaultExpr.match(/^'([^']*)'::/);
  return m ? m[1] : null;
}

async function rewriteEnum(queryInterface, table, column, transaction) {
  if (!(await tableHasColumn(queryInterface, table, column, transaction))) {
    return;
  }

  const enumName = enumTypeNameFor(table, column);
  const newEnumName = `${enumName}__new`;
  const labels = await getEnumLabels(queryInterface, enumName, transaction);
  if (labels.length === 0) return; // type doesn't exist (shouldn't happen, but be safe)

  const removable = labels.filter(l => REMOVED.includes(l));
  if (removable.length === 0) return; // nothing to do, enum already clean

  const kept = labels.filter(l => !REMOVED.includes(l));
  if (!kept.includes('piece')) {
    // Every unit enum in this app has 'piece'; bail rather than silently lose data.
    throw new Error(
      `Cannot rewrite ${enumName}: target enum has no 'piece' fallback (kept=[${kept.join(',')}])`
    );
  }

  // 1. Defensive remap of any leftover rows pointing at removed values.
  const removableList = removable.map(v => `'${v}'`).join(',');
  await queryInterface.sequelize.query(
    `UPDATE "${table}" SET "${column}" = 'piece' WHERE "${column}" IN (${removableList});`,
    { transaction }
  );

  // 2. Capture the column default (typed against the old enum) so we can
  //    detach it before the type swap and re-attach it afterwards. Postgres
  //    refuses to auto-cast a default expression across enum types — that's
  //    the 42804 error this migration tripped on first run.
  const currentDefault = await getColumnDefault(queryInterface, table, column, transaction);
  const defaultLiteral = extractDefaultLiteral(currentDefault);
  if (currentDefault && !defaultLiteral) {
    throw new Error(
      `Cannot rewrite ${enumName}: column "${table}"."${column}" has a non-literal DEFAULT (${currentDefault}) — handle it manually.`
    );
  }
  if (defaultLiteral && REMOVED.includes(defaultLiteral)) {
    // The default itself was a removed value — fall back to 'piece'.
    // (Unlikely for catalog tables but safer than re-attaching an invalid label.)
  }
  if (currentDefault) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT;`,
      { transaction }
    );
  }

  // 3. Create the trimmed sibling enum type. Drop any stale leftover from a
  //    previously interrupted run before recreating.
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "${newEnumName}";`,
    { transaction }
  );
  const keptList = kept.map(v => `'${v}'`).join(',');
  await queryInterface.sequelize.query(
    `CREATE TYPE "${newEnumName}" AS ENUM (${keptList});`,
    { transaction }
  );

  // 4. Swap the column over. USING text cast bridges the two enum types.
  await queryInterface.sequelize.query(
    `ALTER TABLE "${table}"
       ALTER COLUMN "${column}" TYPE "${newEnumName}"
       USING ("${column}"::text::"${newEnumName}");`,
    { transaction }
  );

  // 5. Drop the old type and rename the new one into its slot.
  await queryInterface.sequelize.query(
    `DROP TYPE "${enumName}";`,
    { transaction }
  );
  await queryInterface.sequelize.query(
    `ALTER TYPE "${newEnumName}" RENAME TO "${enumName}";`,
    { transaction }
  );

  // 6. Re-attach the default, retargeted at the renamed-back enum. If the
  //    original default was one of the removed labels, fall back to 'piece'.
  if (defaultLiteral) {
    const safeDefault = REMOVED.includes(defaultLiteral) ? 'piece' : defaultLiteral;
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT '${safeDefault}'::"${enumName}";`,
      { transaction }
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const { table, column } of TARGETS) {
        await rewriteEnum(queryInterface, table, column, transaction);
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    throw new Error(
      'Irreversible: cup/dozen/bunch/pack/other have been removed from the unit enums.'
    );
  },
};
