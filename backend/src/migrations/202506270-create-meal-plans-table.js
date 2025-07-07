'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meal_plans', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      householdId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'households',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: true
        },
        comment: 'Date in YYYY-MM-DD format'
      },
      mealType: {
        type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
        allowNull: false
      },
      servings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 20
        },
        defaultValue: 1
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
    await queryInterface.addIndex('meal_plans', ['householdId']);
    await queryInterface.addIndex('meal_plans', ['recipeId']);
    await queryInterface.addIndex('meal_plans', ['date']);
    await queryInterface.addIndex('meal_plans', ['householdId', 'date']);
    await queryInterface.addIndex('meal_plans', ['householdId', 'date', 'mealType'], {
      name: 'meal_plans_household_date_meal_type'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('meal_plans', ['householdId']);
    await queryInterface.removeIndex('meal_plans', ['recipeId']);
    await queryInterface.removeIndex('meal_plans', ['date']);
    await queryInterface.removeIndex('meal_plans', ['householdId', 'date']);
    await queryInterface.removeIndex('meal_plans', 'meal_plans_household_date_meal_type');
    
    // Drop the table
    await queryInterface.dropTable('meal_plans');
  }
}; 