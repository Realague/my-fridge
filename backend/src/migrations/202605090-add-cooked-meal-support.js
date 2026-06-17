'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration}
 *
 * Adds support for cooked meals (batch cooking):
 *   1. Extends the `enum_items_category` enum with `cooked_meal`.
 *   2. Adds `recipeId` (nullable FK -> recipes.id, ON DELETE SET NULL) on `items`.
 *   3. Adds `cookedDate` (nullable DATEONLY) on `stored_items`.
 *
 * Step 1 is run separately because PostgreSQL refuses ALTER TYPE inside a
 * transaction. Steps 2 & 3 run in the default transaction.
 *
 * Note: a follow-up migration (202605091-add-serving-to-unit-enums.js)
 * extends the unit enums with `serving`, which was missing from
 * `enum_stored_items_unit` (and the others) in the initial schema. Adding a
 * cooked-meal StoredItem fails until that one runs.
 */
module.exports = {
  // Required for ALTER TYPE on Postgres (see also fish/seafood enum migration).
  transaction: false,

  async up(queryInterface) {
    // 1. Enum extension
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_items_category" ADD VALUE IF NOT EXISTS 'cooked_meal';
    `);

    // 2. Item.recipeId
    await queryInterface.addColumn('items', 'recipeId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'recipes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional link to source recipe (cooked meals only).',
    });
    await queryInterface.addIndex('items', ['recipeId'], {
      name: 'items_recipe_id_idx',
    });

    // 3. StoredItem.cookedDate
    await queryInterface.addColumn('stored_items', 'cookedDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date the dish was cooked (cooked_meal articles only).',
    });
  },

  async down() {
    throw new Error(
      'Cannot rollback this migration: enum values cannot be dropped in PostgreSQL. Manual intervention required.'
    );
  },
};
