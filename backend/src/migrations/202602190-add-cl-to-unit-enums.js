'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Disable transaction for this migration because ALTER TYPE ... ADD VALUE
  // cannot run inside a transaction in PostgreSQL
  transaction: false,
  
  async up(queryInterface, Sequelize) {
    // Add 'cl' to enum types for unit columns
    // Note: Sequelize may create enum types with camelCase preserved
    // Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL
    // So we use raw SQL query outside of Sequelize's transaction
    
    // Find enum type for items.defaultUnit by querying the actual column definition
    await queryInterface.sequelize.query(`
      DO $$ 
      DECLARE
        enum_type_name TEXT;
      BEGIN
        -- Find the enum type by looking at the actual column definition
        SELECT t.typname INTO enum_type_name
        FROM pg_type t
        JOIN pg_attribute a ON a.atttypid = t.oid
        JOIN pg_class c ON a.attrelid = c.oid
        WHERE c.relname = 'items' 
          AND a.attname = 'defaultUnit'
          AND t.typtype = 'e'
        LIMIT 1;
        
        -- If enum type found and 'cl' doesn't exist, add it
        IF enum_type_name IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'cl' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_type_name)
        ) THEN
          EXECUTE format('ALTER TYPE %I ADD VALUE %L', enum_type_name, 'cl');
        END IF;
      END $$;
    `);

    // Find enum type for stored_items.unit by querying the actual column definition
    await queryInterface.sequelize.query(`
      DO $$ 
      DECLARE
        enum_type_name TEXT;
      BEGIN
        -- Find the enum type by looking at the actual column definition
        SELECT t.typname INTO enum_type_name
        FROM pg_type t
        JOIN pg_attribute a ON a.atttypid = t.oid
        JOIN pg_class c ON a.attrelid = c.oid
        WHERE c.relname = 'stored_items' 
          AND a.attname = 'unit'
          AND t.typtype = 'e'
        LIMIT 1;
        
        -- If enum type found and 'cl' doesn't exist, add it
        IF enum_type_name IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'cl' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_type_name)
        ) THEN
          EXECUTE format('ALTER TYPE %I ADD VALUE %L', enum_type_name, 'cl');
        END IF;
      END $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing values from enums directly
    // This would require recreating the enum type, which is complex and risky
    // For safety, we'll leave a comment explaining this limitation
    // If rollback is truly needed, it would require:
    // 1. Creating a new enum without 'cl'
    // 2. Altering the column to use the new enum
    // 3. Dropping the old enum
    // This is not implemented as it's risky and may cause data loss
    
    throw new Error('Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.');
  }
};
