'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expiration_notifications', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      householdId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'households',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      storedItemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'stored_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phase: {
        type: DataTypes.ENUM('initial', 'reminder'),
        allowNull: false,
      },
      itemNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      storageAreaNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      storageAreaIdSnapshot: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      expirationDateSnapshot: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      isOpenedSnapshot: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      openedDateSnapshot: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      quantitySnapshot: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      unitSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
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

    await queryInterface.addConstraint('expiration_notifications', {
      fields: ['storedItemId', 'phase'],
      type: 'unique',
      name: 'unique_expiration_notification_per_item_phase',
    });

    await queryInterface.addIndex('expiration_notifications', ['householdId']);
    await queryInterface.addIndex('expiration_notifications', ['createdAt']);
    await queryInterface.addIndex('expiration_notifications', ['householdId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expiration_notifications');
  },
};
