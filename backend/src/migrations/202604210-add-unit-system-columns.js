'use strict';

/**
 * Adds schema support for the unit system overhaul:
 *   - New free-quantity (gestural) unit values: 'pinch', 'drizzle', 'knob'
 *     on all relevant Postgres enum types.
 *   - New column `items.pieceAlias` (nullable string) — display alias used
 *     in place of "piece" (e.g. "gousse" for garlic, "tranche" for ham).
 *   - New column `recipe_ingredients.isFreeQuantity` (boolean, default false) —
 *     marks an ingredient whose quantity is approximate ("à l'œil"). When true,
 *     the ingredient is not counted against stock and not auto-added to the
 *     shopping list.
 *   - `recipe_ingredients.quantity` becomes nullable (free-quantity rows have no number).
 *
 * Must run with `transaction: false` because ALTER TYPE ... ADD VALUE cannot
 * run inside a Postgres transaction.
 */

const { DataTypes } = require('sequelize');

const NEW_UNIT_VALUES = ['pinch', 'drizzle', 'knob'];

// Postgres enum type names for every tables.column pair that uses the Unit enum.
// Sequelize auto-generates these as `enum_<table>_<column>`.
const ENUM_TYPES = [
  'enum_items_defaultUnit',
  'enum_stored_items_unit',
  'enum_recipe_ingredients_unit',
  'enum_item_minimums_minimumUnit',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  transaction: false,

  async up(queryInterface) {
    for (const enumType of ENUM_TYPES) {
      for (const value of NEW_UNIT_VALUES) {
        await queryInterface.sequelize.query(
          `ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS '${value}';`
        );
      }
    }

    await queryInterface.addColumn('items', 'pieceAlias', {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Display alias used in place of "piece" for this item (e.g. "gousse" for garlic)'
    });

    await queryInterface.addColumn('recipe_ingredients', 'isFreeQuantity', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'When true, the ingredient has no numeric quantity ("à l\'œil") and is skipped in stock/shopping computations'
    });

    await queryInterface.changeColumn('recipe_ingredients', 'quantity', {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.changeColumn('recipe_ingredients', 'quantity', {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
    });
    await queryInterface.removeColumn('recipe_ingredients', 'isFreeQuantity');
    await queryInterface.removeColumn('items', 'pieceAlias');
    // Enum values cannot be removed in Postgres without recreating the type.
    // Left in place on purpose.
  },
};
