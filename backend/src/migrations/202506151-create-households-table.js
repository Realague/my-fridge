'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('households', {
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      inviteCode: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
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
    await queryInterface.addIndex('households', ['inviteCode']);
    await queryInterface.addIndex('households', ['createdBy']);

    // Add selectedHouseholdId column to users table now that households table exists
    await queryInterface.addColumn('users', 'selectedHouseholdId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'households',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Add index for better performance
    await queryInterface.addIndex('users', ['selectedHouseholdId']);
  },

  async down (queryInterface, Sequelize) {
    // Remove the selectedHouseholdId column from users table
    await queryInterface.removeColumn('users', 'selectedHouseholdId');
    
    // Drop the households table
    await queryInterface.dropTable('households');
  }
};
