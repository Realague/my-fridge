'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recipes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 255]
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 1000]
        }
      },
      prepTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        comment: 'Preparation time in minutes'
      },
      cookTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        comment: 'Cooking time in minutes'
      },
      servings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      difficulty: {
        type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
        allowNull: false,
        defaultValue: 'Easy'
      },
      instructions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of instruction steps'
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of recipe tags'
      },
      image: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Recipe image URL or base64 data'
      },
      isFavorite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.addIndex('recipes', ['householdId']);
    await queryInterface.addIndex('recipes', ['createdBy']);
    await queryInterface.addIndex('recipes', ['difficulty']);
    await queryInterface.addIndex('recipes', ['isFavorite']);
    await queryInterface.addIndex('recipes', ['householdId', 'isFavorite']);
    await queryInterface.addIndex('recipes', ['householdId', 'difficulty']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('recipes');
  }
}; 