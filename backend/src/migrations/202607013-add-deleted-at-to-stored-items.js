'use strict';

const { DataTypes } = require('sequelize');

// Enable Sequelize `paranoid` soft-delete on stored_items. The model uses
// camelCase timestamps (createdAt/updatedAt), so the soft-delete column is
// `deletedAt` (camelCase) to match the paranoid default.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stored_items', 'deletedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stored_items', 'deletedAt');
  },
};
