'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('storage_areas', 'sort_order', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Sort order for priority (lower = higher priority)'
    });

    await queryInterface.addIndex('storage_areas', ['householdId', 'sort_order'], {
      name: 'storage_areas_household_sort_order_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('storage_areas', 'storage_areas_household_sort_order_idx');
    await queryInterface.removeColumn('storage_areas', 'sort_order');
  }
};
