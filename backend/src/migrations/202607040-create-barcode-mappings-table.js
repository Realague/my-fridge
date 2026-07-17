'use strict';

const { DataTypes } = require('sequelize');

// Mirror of BARCODE_FORMATS in src/types/enums.ts — kept in sync manually.
const BARCODE_FORMATS = [
  'ean13', 'ean8', 'code128', 'code39', 'qr', 'data_matrix', 'pdf417', 'aztec', 'other',
];

/**
 * Global, cross-household barcode → catalog item mapping table.
 * See src/models/BarcodeMapping.ts for the full rationale (shared mapping with
 * validated_count-based conflict resolution).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('barcode_mappings', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      barcode: { type: DataTypes.STRING, allowNull: false },
      item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      format: { type: DataTypes.ENUM(...BARCODE_FORMATS), allowNull: true, defaultValue: null },
      confidence: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0.7 },
      validated_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { allowNull: false, type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { allowNull: false, type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('barcode_mappings', ['barcode']);
    await queryInterface.addConstraint('barcode_mappings', {
      fields: ['barcode', 'item_id'],
      type: 'unique',
      name: 'unique_barcode_item',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('barcode_mappings');
    // Drop the enum type created for the format column (Postgres).
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_barcode_mappings_format";');
  },
};
