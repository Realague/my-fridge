module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('items', 'nameKey', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Translation key for seeded items (e.g., "tomato" for items.tomato)',
    });

    // Add index for nameKey to optimize searches
    await queryInterface.addIndex('items', ['nameKey'], {
      name: 'items_nameKey_idx'
    });

    console.log('✅ Added nameKey column and index to items table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('items', 'items_nameKey_idx');
    await queryInterface.removeColumn('items', 'nameKey');
    console.log('✅ Removed nameKey column and index from items table');
  },
};
