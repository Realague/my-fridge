'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Disable transaction for this migration because ALTER TYPE ... ADD VALUE
  // cannot run inside a transaction in PostgreSQL
  transaction: false,

  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_items_category" ADD VALUE IF NOT EXISTS 'fish';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_items_category" ADD VALUE IF NOT EXISTS 'seafood';
    `);
  },

  async down() {
    throw new Error('Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.');
  }
};
