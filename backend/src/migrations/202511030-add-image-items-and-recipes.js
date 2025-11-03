'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('items', 'imageUrl', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('recipes', 'imageUrl', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('items', 'imageUrl');
    await queryInterface.removeColumn('recipes', 'imageUrl');
  }
};
