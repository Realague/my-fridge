'use strict';

const { DataTypes } = require('sequelize');

/**
 * Import traceability: record where an imported recipe came from and when it
 * was ingested. `sourceUrl` already exists (see 202512210); this adds the
 * companion columns required by the Schema.org import pipeline.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('recipes', 'sourceDomain', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('recipes', 'importedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('recipes', 'importedAt');
    await queryInterface.removeColumn('recipes', 'sourceDomain');
  }
};
