'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the excludeFromShopping column
    await queryInterface.addColumn('items', 'excludeFromShopping', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this item will not be added to shopping lists (e.g., water)'
    });

    // Set excludeFromShopping = true for water items
    await queryInterface.sequelize.query(`
      UPDATE items 
      SET "excludeFromShopping" = true 
      WHERE name IN ('water', 'water2')
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('items', 'excludeFromShopping');
  }
};

