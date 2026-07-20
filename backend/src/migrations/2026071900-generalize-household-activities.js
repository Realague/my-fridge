'use strict';

const { DataTypes } = require('sequelize');

// ADD VALUE (enum) ne peut pas tourner dans une transaction Postgres.
const NEW_ACTIONS = [
  'item_quantity_changed',
  'item_expiration_changed',
  'item_consumed',
  'item_thrown',
  'item_removed',
  'shopping_removed',
  'recipe_planned',
  'recipe_servings_changed',
  'recipe_cooked',
  'recipe_unplanned',
];

const TARGET_TYPES = ['item', 'shopping_item', 'meal', 'recipe'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  transaction: false,

  async up(queryInterface, Sequelize) {
    // 1. Élargir l'enum d'actions (idempotent).
    for (const value of NEW_ACTIONS) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_household_activities_action" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }

    // 2. Type enum pour targetType (créé s'il n'existe pas).
    const [typeRows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_type WHERE typname = 'enum_household_activities_targetType' LIMIT 1;`
    );
    if (typeRows.length === 0) {
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_household_activities_targetType" AS ENUM ('${TARGET_TYPES.join("','")}');`
      );
    }

    // 3. Colonnes (idempotent via describeTable).
    const table = await queryInterface.describeTable('household_activities');

    if (!table.targetType) {
      await queryInterface.addColumn('household_activities', 'targetType', {
        type: '"enum_household_activities_targetType"',
        allowNull: true,
      });
    }
    if (!table.targetId) {
      await queryInterface.addColumn('household_activities', 'targetId', {
        type: DataTypes.UUID,
        allowNull: true,
      });
    }
    if (!table.metadata) {
      await queryInterface.addColumn('household_activities', 'metadata', {
        type: DataTypes.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('household_activities', 'metadata');
    await queryInterface.removeColumn('household_activities', 'targetId');
    await queryInterface.removeColumn('household_activities', 'targetType');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_household_activities_targetType";'
    );
    // Les valeurs d'enum ajoutées ne sont pas retirables en Postgres — laissées en place.
  },
};
