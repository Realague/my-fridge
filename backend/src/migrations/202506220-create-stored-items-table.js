'use strict';

const { DataTypes } = require('sequelize');

// Units: 'g', 'kg', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz', 'gallon', 'piece', 'pack', 'bunch', 'dozen', 'other'
// Defined in: backend/src/types/enums.ts

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('stored_items', {
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
      storageAreaId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'storage_areas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1.0,
        validate: {
          min: 1
        }
      },
      unit: {
        type: DataTypes.ENUM('g', 'kg', 'lb', 'oz', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'fl_oz', 'gallon', 'piece', 'pack', 'bunch', 'dozen', 'other'),
        allowNull: false,
        defaultValue: 'piece'
      },
      expirationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      location: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500]
        }
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
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('stored_items', ['itemId']);
    await queryInterface.addIndex('stored_items', ['storageAreaId']);
    await queryInterface.addIndex('stored_items', ['householdId']);
    await queryInterface.addIndex('stored_items', ['createdBy']);
    await queryInterface.addIndex('stored_items', ['expirationDate']);
    await queryInterface.addIndex('stored_items', ['householdId', 'storageAreaId']);
    await queryInterface.addIndex('stored_items', ['householdId', 'itemId']);
    await queryInterface.addIndex('stored_items', ['storageAreaId', 'itemId']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('stored_items');
  }
}; 