'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'refreshToken', {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn('users', 'refreshTokenExpiresAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    // Add index for performance on refresh token lookups
    await queryInterface.addIndex('users', ['refreshToken']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'refreshToken');
    await queryInterface.removeColumn('users', 'refreshTokenExpiresAt');
  }
};
