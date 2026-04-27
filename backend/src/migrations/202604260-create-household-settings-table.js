'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('household_settings', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      householdId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'households',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      expirationAlertDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE "household_settings" ADD CONSTRAINT "household_settings_expiration_alert_days_range" CHECK ("expirationAlertDays" BETWEEN 1 AND 14)'
    );

    await queryInterface.addIndex('household_settings', ['householdId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('household_settings');
  },
};
