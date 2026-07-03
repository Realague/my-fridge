'use strict';

// Add a real FK from stock_exits.storedItemId -> stored_items(id).
// Now that stored_items is soft-delete (paranoid), the referenced row survives
// a "removal", so the FK stays valid. On a hard-delete of the stored item
// (cascade), the log link is nulled out instead of blocking the delete.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // First, null-out any orphan links so the constraint can be added cleanly.
    await queryInterface.sequelize.query(
      'UPDATE stock_exits SET "storedItemId" = NULL WHERE "storedItemId" IS NOT NULL AND "storedItemId" NOT IN (SELECT id FROM stored_items)'
    );

    await queryInterface.addConstraint('stock_exits', {
      fields: ['storedItemId'],
      type: 'foreign key',
      name: 'fk_stock_exits_stored_item',
      references: {
        table: 'stored_items',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('stock_exits', 'fk_stock_exits_stored_item');
  },
};
