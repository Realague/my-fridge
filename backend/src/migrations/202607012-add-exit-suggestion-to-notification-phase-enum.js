'use strict';

/** @type {import('sequelize-cli').Migration}
 *
 * Adds the `exit_suggestion` value to the expiration-notification phase enum.
 * Defensive: only ALTER the enum type if it actually exists.
 */
module.exports = {
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
  transaction: false,

  async up(queryInterface) {
    const name = 'enum_expiration_notifications_phase';

    const [rows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_type WHERE typname = :name LIMIT 1;`,
      { replacements: { name } }
    );
    if (rows.length === 0) {
      // Type doesn't exist (column migrated to STRING or table not present).
      return;
    }

    await queryInterface.sequelize.query(
      `ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS 'exit_suggestion';`
    );
  },

  async down() {
    throw new Error(
      'Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.'
    );
  },
};
