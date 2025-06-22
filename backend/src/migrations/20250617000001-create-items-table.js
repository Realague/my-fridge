'use strict';

const { DataTypes } = require('sequelize');

// Item categories: 'vegetables', 'fruits', 'meat', 'dairy', 'grains', 'spices', 'beverages', 'snacks', 'condiments', 'frozen', 'canned', 'other'
// Units: 'g', 'kg', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz', 'pint', 'quart', 'gallon', 'piece', 'pack', 'bunch', 'dozen', 'other'
// Defined in: backend/src/types/enums.ts

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('items', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 100]
        }
      },
      category: {
        type: DataTypes.ENUM('vegetables', 'fruits', 'meat', 'dairy', 'grains', 'spices', 'beverages', 'snacks', 'condiments', 'frozen', 'canned', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      defaultUnit: {
        type: DataTypes.ENUM('g', 'kg', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz', 'pint', 'quart', 'gallon', 'piece', 'pack', 'bunch', 'dozen', 'other'),
        allowNull: false,
        defaultValue: 'piece'
      },
      availableUnits: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: JSON.stringify(['piece'])
      },
      householdId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'households',
          key: 'id'
        }
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('items', ['category']);
    await queryInterface.addIndex('items', ['name']);
    await queryInterface.addIndex('items', ['createdBy']);
    await queryInterface.addIndex('items', ['householdId']);
    await queryInterface.addIndex('items', ['householdId', 'category']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('items');
  }
}; 