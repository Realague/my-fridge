'use strict';

const { DataTypes } = require('sequelize');

const BRAND_CATEGORIES = [
  'grande_distribution', 'hard_discount', 'bio_alimentaire', 'surgele',
  'beaute', 'bricolage_maison', 'sport_culture_tech', 'mode'
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('brands', {
      id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      normalizedName: { type: DataTypes.STRING, allowNull: false },
      domain: { type: DataTypes.STRING, allowNull: true },
      color: { type: DataTypes.STRING(7), allowNull: true },
      logoPath: { type: DataTypes.STRING, allowNull: true },
      category: { type: DataTypes.ENUM(...BRAND_CATEGORIES), allowNull: true },
      isCurated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      usageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { allowNull: false, type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('brands', ['normalizedName']);
    await queryInterface.addIndex('brands', ['category']);
    await queryInterface.addIndex('brands', ['isCurated']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('brands');
    // Drop the enum type created for the category column (Postgres).
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_brands_category";');
  }
};
