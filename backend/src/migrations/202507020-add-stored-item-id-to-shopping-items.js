'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shopping_items', 'stored_item_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'stored_items',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for better query performance
    await queryInterface.addIndex('shopping_items', ['stored_item_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('shopping_items', ['stored_item_id']);
    await queryInterface.removeColumn('shopping_items', 'stored_item_id');
  }
}; 