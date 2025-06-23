'use strict';

const { DataTypes } = require('sequelize');

// Storage area types: 'fridge', 'freezer', 'pantry', 'kitchen_cupboard', 'other'
// Defined in: backend/src/types/enums.ts

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('storage_areas', {
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
      emoji: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '📦'
      },
              type: {
          type: DataTypes.ENUM('fridge', 'freezer', 'pantry', 'kitchen_cupboard', 'other'),
          allowNull: false,
          defaultValue: 'other'
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
    await queryInterface.addIndex('storage_areas', ['householdId']);
    await queryInterface.addIndex('storage_areas', ['type']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('storage_areas');
  }
}; 