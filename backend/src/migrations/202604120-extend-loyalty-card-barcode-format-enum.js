'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  transaction: false,

  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_loyalty_cards_barcodeFormat" ADD VALUE IF NOT EXISTS 'data_matrix';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_loyalty_cards_barcodeFormat" ADD VALUE IF NOT EXISTS 'pdf417';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_loyalty_cards_barcodeFormat" ADD VALUE IF NOT EXISTS 'aztec';
    `);
  },

  async down() {
    throw new Error(
      'Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.'
    );
  },
};
