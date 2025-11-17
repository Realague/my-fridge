'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add unique constraint to ensure only one item per household with the same unit
    await queryInterface.addConstraint('shopping_items', {
      fields: ['household_id', 'item_id', 'unit', 'completed'],
      type: 'unique',
      name: 'unique_household_item_unit_completed'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove the unique constraint
    await queryInterface.removeConstraint('shopping_items', 'unique_household_item_unit_completed');
  }
};
