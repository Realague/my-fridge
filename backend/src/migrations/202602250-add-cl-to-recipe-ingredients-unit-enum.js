'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL
  transaction: false,

  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_recipe_ingredients_unit" ADD VALUE IF NOT EXISTS 'cl';
    `);
  },

  async down() {
    throw new Error('Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.');
  }
};
