'use strict';

const { DataTypes } = require('sequelize');

// Units: 'g', 'kg', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz', 'pint', 'quart', 'gallon', 'piece', 'pack', 'bunch', 'dozen', 'other'
// Defined in: backend/src/types/enums.ts

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recipe_ingredients', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      recipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        validate: {
          min: 0.001
        }
      },
      unit: {
        type: DataTypes.ENUM('g', 'kg', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz', 'pint', 'quart', 'gallon', 'piece', 'pack', 'bunch', 'dozen', 'other'),
        allowNull: false,
        defaultValue: 'piece'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500]
        },
        comment: 'Additional info like "chopped", "fresh", etc.'
      },
      usedInSteps: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of step indices where this ingredient is used'
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
    await queryInterface.addIndex('recipe_ingredients', ['recipeId']);
    await queryInterface.addIndex('recipe_ingredients', ['itemId']);
    await queryInterface.addIndex('recipe_ingredients', ['recipeId', 'itemId'], {
      unique: true,
      name: 'recipe_ingredients_recipe_item_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('recipe_ingredients');
  }
}; 