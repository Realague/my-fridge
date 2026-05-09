'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('push_subscriptions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      p256dh: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      auth: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('push_subscriptions', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('push_subscriptions');
  },
};
