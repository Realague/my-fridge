'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('items', 'daysAfterOpening', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Number of days the item can be consumed after opening'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('items', 'daysAfterOpening');
  }
};
