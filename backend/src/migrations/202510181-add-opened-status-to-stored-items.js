'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stored_items', 'isOpened', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the item has been opened'
    });

    await queryInterface.addColumn('stored_items', 'openedDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when the item was opened'
    });

    // Add index for querying opened items
    await queryInterface.addIndex('stored_items', ['isOpened'], {
      name: 'stored_items_is_opened_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('stored_items', 'stored_items_is_opened_idx');
    await queryInterface.removeColumn('stored_items', 'openedDate');
    await queryInterface.removeColumn('stored_items', 'isOpened');
  }
};
