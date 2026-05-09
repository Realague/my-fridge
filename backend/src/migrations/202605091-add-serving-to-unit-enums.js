'use strict';

/** @type {import('sequelize-cli').Migration}
 *
 * Ensures `serving` is a valid value in every Postgres unit enum that exists.
 *
 * The initial schema (202506220-create-stored-items-table.js) created
 * `enum_stored_items_unit` WITHOUT the `serving` label, even though
 * `Unit.SERVING` was always part of the TS enum. The catalog enum
 * (`enum_items_defaultUnit`) was created with `serving` from day one.
 *
 * Some unit columns have since been migrated from ENUM to STRING (notably
 * `shopping_items.unit`), so the corresponding enum type may or may not
 * exist anymore. This migration is defensive: it queries `pg_type` first and
 * only runs `ALTER TYPE ... ADD VALUE` for enums that actually exist.
 *
 * Runtime symptom before this runs (when adding a cooked meal in stock):
 *   `invalid input value for enum enum_stored_items_unit: "serving"`
 */
module.exports = {
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
  transaction: false,

  async up(queryInterface) {
    const candidates = [
      'enum_items_defaultUnit',
      'enum_stored_items_unit',
      'enum_shopping_items_unit',
      'enum_recipe_ingredients_unit',
      'enum_item_minimums_minimumUnit',
    ];

    for (const name of candidates) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_type WHERE typname = :name LIMIT 1;`,
        { replacements: { name } }
      );
      if (rows.length === 0) {
        // Type doesn't exist (column is now STRING, or table never had this enum).
        continue;
      }
      await queryInterface.sequelize.query(
        `ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS 'serving';`
      );
    }
  },

  async down() {
    throw new Error(
      'Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.'
    );
  },
};
