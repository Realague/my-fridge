'use strict';

const { DataTypes } = require('sequelize');

// Mirror the Unit enum values from src/types/enums.ts (kept in sync manually,
// like the stored_items unit enum). Order is not significant.
const UNIT_VALUES = [
  'g',
  'kg',
  'ml',
  'cl',
  'l',
  'tbsp',
  'tsp',
  'piece',
  'serving',
  'pinch',
  'drizzle',
  'knob',
];

const EXIT_TYPE_VALUES = ['consumed', 'wasted', 'removed'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_exits', {
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
      // storedItemId / itemId are plain UUIDs (no FK): the referenced rows may
      // be deleted; we keep a link/snapshot instead.
      storedItemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      exitType: {
        type: DataTypes.ENUM(...EXIT_TYPE_VALUES),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
      },
      unit: {
        type: DataTypes.ENUM(...UNIT_VALUES),
        allowNull: false,
      },
      exitedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      itemNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      categorySnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      storageAreaIdSnapshot: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      storageAreaNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      expirationDateSnapshot: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      restoreSnapshot: {
        type: DataTypes.JSONB,
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

    await queryInterface.addIndex('stock_exits', ['householdId']);
    await queryInterface.addIndex('stock_exits', ['exitedBy']);
    await queryInterface.addIndex('stock_exits', ['householdId', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_exits');
    // Drop the enum types created alongside the table so a re-run is clean.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_exits_exitType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_exits_unit";');
  },
};
