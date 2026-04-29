'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex('meal_plans', 'meal_plans_household_date_meal_type').catch(() => {});
    await queryInterface.removeIndex('meal_plans', ['householdId', 'date']).catch(() => {});
    await queryInterface.removeIndex('meal_plans', ['date']).catch(() => {});

    await queryInterface.removeColumn('meal_plans', 'date');
    await queryInterface.removeColumn('meal_plans', 'mealType');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_meal_plans_mealType"');

    await queryInterface.addColumn('meal_plans', 'position', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(`
      UPDATE meal_plans
      SET position = sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "householdId" ORDER BY "createdAt") AS rn
        FROM meal_plans
      ) sub
      WHERE meal_plans.id = sub.id
    `);

    await queryInterface.renameTable('meal_plans', 'meals');

    await queryInterface.addIndex('meals', ['householdId', 'position'], {
      name: 'meals_household_id_position',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('meals', 'meals_household_id_position').catch(() => {});
    await queryInterface.renameTable('meals', 'meal_plans');
    await queryInterface.removeColumn('meal_plans', 'position');

    await queryInterface.addColumn('meal_plans', 'date', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('meal_plans', 'mealType', {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
      allowNull: true,
    });

    await queryInterface.addIndex('meal_plans', ['date']);
    await queryInterface.addIndex('meal_plans', ['householdId', 'date']);
    await queryInterface.addIndex('meal_plans', ['householdId', 'date', 'mealType'], {
      name: 'meal_plans_household_date_meal_type',
    });
  },
};
