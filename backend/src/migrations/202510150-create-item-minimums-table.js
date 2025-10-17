'use strict';

const { DataTypes } = require('sequelize');

// Units: 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'pack', 'bunch', 'dozen', 'other'
// Defined in: backend/src/types/enums.ts

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('item_minimums', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
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
      minimumQuantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      minimumUnit: {
        type: DataTypes.ENUM('g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'pack', 'bunch', 'dozen', 'other'),
        allowNull: false,
        defaultValue: 'piece'
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      },
      shoppingQuantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 0
        }
      }
    });

    // Add unique constraint: one minimum per item per household per unit
    await queryInterface.addConstraint('item_minimums', {
      fields: ['itemId', 'householdId', 'minimumUnit'],
      type: 'unique',
      name: 'unique_item_household_minimum_unit'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('item_minimums', ['itemId']);
    await queryInterface.addIndex('item_minimums', ['householdId']);
    await queryInterface.addIndex('item_minimums', ['createdBy']);
    await queryInterface.addIndex('item_minimums', ['householdId', 'itemId']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('item_minimums');
  }
};
