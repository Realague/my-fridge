'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration}
 *
 * Adds `cookedAt` (nullable TIMESTAMP) on `meals`. A non-null value marks a
 * meal as already cooked: it disappears from the active plan but the row
 * stays for stats and history.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('meals', 'cookedAt', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the meal was cooked. NULL = still planned.',
    });
    await queryInterface.addIndex('meals', ['householdId', 'cookedAt'], {
      name: 'meals_household_cooked_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('meals', 'meals_household_cooked_at_idx');
    await queryInterface.removeColumn('meals', 'cookedAt');
  },
};
