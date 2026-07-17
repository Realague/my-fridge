'use strict';

const { DataTypes } = require('sequelize');

/**
 * Introduce the `status` column on shopping_items (TO_BUY / TO_STORE) and retire
 * the boolean `completed`.
 *
 *  - completed=false  -> status='to_buy'   (À acheter)
 *  - completed=true   -> row is deleted     (already-stored history; the
 *                        matching StoredItem already exists in stock, so keeping
 *                        it would make it reappear in the new "À ranger" section)
 *
 * The "À ranger" (to_store) state is only ever produced by the app going forward.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add the new column with a safe default.
    await queryInterface.addColumn('shopping_items', 'status', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'to_buy',
    });

    // 2. Backfill: active (non-completed) items become "to_buy".
    await queryInterface.sequelize.query(
      `UPDATE shopping_items SET status = 'to_buy' WHERE completed = false;`
    );

    // 3. Purge already-stored history (completed=true); the StoredItem exists.
    await queryInterface.sequelize.query(
      `DELETE FROM shopping_items WHERE completed = true;`
    );

    // 4. Drop everything that references the old `completed` column.
    await queryInterface.removeConstraint(
      'shopping_items',
      'unique_household_item_unit_completed'
    );
    await queryInterface.removeIndex('shopping_items', ['completed']);
    await queryInterface.removeIndex('shopping_items', ['household_id', 'completed']);

    // 5. Remove the column.
    await queryInterface.removeColumn('shopping_items', 'completed');

    // 6. Recreate indexes + unique constraint against `status`.
    await queryInterface.addIndex('shopping_items', ['status']);
    await queryInterface.addIndex('shopping_items', ['household_id', 'status']);
    await queryInterface.addConstraint('shopping_items', {
      fields: ['household_id', 'item_id', 'unit', 'status'],
      type: 'unique',
      name: 'unique_household_item_unit_status',
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse: restore the boolean `completed` column.
    await queryInterface.removeConstraint(
      'shopping_items',
      'unique_household_item_unit_status'
    );
    await queryInterface.removeIndex('shopping_items', ['status']);
    await queryInterface.removeIndex('shopping_items', ['household_id', 'status']);

    await queryInterface.addColumn('shopping_items', 'completed', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(
      `UPDATE shopping_items SET completed = (status = 'to_store');`
    );

    await queryInterface.removeColumn('shopping_items', 'status');

    await queryInterface.addIndex('shopping_items', ['completed']);
    await queryInterface.addIndex('shopping_items', ['household_id', 'completed']);
    await queryInterface.addConstraint('shopping_items', {
      fields: ['household_id', 'item_id', 'unit', 'completed'],
      type: 'unique',
      name: 'unique_household_item_unit_completed',
    });
  },
};
