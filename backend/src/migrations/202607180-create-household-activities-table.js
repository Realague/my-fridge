'use strict';

const { DataTypes } = require('sequelize');

const ACTION_VALUES = ['item_added', 'shopping_added', 'shopping_checked'];
const BATCH = 5000;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('household_activities', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      householdId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Plain UUID, no FK: the referenced item may be hard-deleted.
      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      itemNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      action: {
        type: DataTypes.ENUM(...ACTION_VALUES),
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('household_activities', ['householdId', 'userId', 'createdAt']);
    await queryInterface.addIndex('household_activities', ['householdId', 'action', 'createdAt']);
    await queryInterface.addIndex('household_activities', ['householdId', 'createdAt']);

    // Backfill `item_added` from ALL stored_items history, including soft-deleted
    // rows (raw SQL bypasses the paranoid scope). Keyset-batched on the PK to
    // stay O(n) and avoid a single table-locking statement. stored_items uses
    // camelCase quoted columns.
    let lastId = '00000000-0000-0000-0000-000000000000';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [rows] = await queryInterface.sequelize.query(
        `
        WITH batch AS (
          SELECT si.id,
                 si."householdId" AS household_id,
                 si."createdBy"   AS user_id,
                 si."itemId"      AS item_id,
                 i."name"         AS item_name,
                 si."createdAt"   AS created_at
          FROM stored_items si
          LEFT JOIN items i ON i.id = si."itemId"
          WHERE si.id > :lastId
          ORDER BY si.id ASC
          LIMIT :batch
        ),
        ins AS (
          INSERT INTO household_activities
            (id, "householdId", "userId", "itemId", "itemNameSnapshot", action, "createdAt", "updatedAt")
          SELECT gen_random_uuid(), household_id, user_id, item_id, item_name,
                 'item_added', created_at, created_at
          FROM batch
          RETURNING 1
        )
        SELECT (SELECT max(id) FROM batch) AS last_id,
               (SELECT count(*) FROM batch) AS n
        `,
        { replacements: { lastId, batch: BATCH } }
      );

      const n = Number(rows[0].n);
      if (n === 0) break;
      lastId = rows[0].last_id;
      if (n < BATCH) break;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('household_activities');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_household_activities_action";'
    );
  },
};
