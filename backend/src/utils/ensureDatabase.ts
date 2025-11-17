import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Ensures the database exists, creating it if necessary
 */
export async function ensureDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME || 'my_fridge_db';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';

  // Connect to the default 'postgres' database to check/create our database
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await client.connect();
    
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`📦 Database '${dbName}' does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully!`);
    } else {
      console.log(`✅ Database '${dbName}' already exists.`);
    }
  } catch (error) {
    console.error('❌ Error ensuring database exists:', error);
    throw error;
  } finally {
    await client.end();
  }
}

