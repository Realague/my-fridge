'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stored_items', 'frozenDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when the item was placed in the freezer'
    });

    // Add index for querying frozen items
    await queryInterface.addIndex('stored_items', ['frozenDate'], {
      name: 'stored_items_frozen_date_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('stored_items', 'stored_items_frozen_date_idx');
    await queryInterface.removeColumn('stored_items', 'frozenDate');
  }
};

