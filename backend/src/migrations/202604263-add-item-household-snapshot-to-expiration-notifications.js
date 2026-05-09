'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('expiration_notifications', 'itemHouseholdIdSnapshot', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('expiration_notifications', 'itemHouseholdIdSnapshot');
  },
};
