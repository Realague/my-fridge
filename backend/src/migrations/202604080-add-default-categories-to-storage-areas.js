'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('storage_areas', 'default_categories', {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Default item categories for this storage area (used for auto-suggestion when storing items)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('storage_areas', 'default_categories');
  }
};
