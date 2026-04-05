'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('loyalty_cards', {
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
      storeSlug: {
        type: DataTypes.STRING,
        allowNull: true
      },
      storeName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      cardNumber: {
        type: DataTypes.STRING,
        allowNull: false
      },
      barcodeData: {
        type: DataTypes.STRING,
        allowNull: true
      },
      barcodeFormat: {
        type: DataTypes.ENUM('ean13', 'ean8', 'code128', 'code39', 'qr', 'other'),
        allowNull: true,
        defaultValue: null
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: true
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

    await queryInterface.addIndex('loyalty_cards', ['householdId']);
    await queryInterface.addIndex('loyalty_cards', ['createdBy']);
    await queryInterface.addIndex('loyalty_cards', ['householdId', 'storeSlug']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('loyalty_cards');
  }
};
