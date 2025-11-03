'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('items', 'image_url', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('recipes', 'image_url', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('items', 'image_url');
    await queryInterface.removeColumn('recipes', 'image_url');
  }
};
