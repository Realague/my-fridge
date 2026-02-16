import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Create Sequelize instance with explicit options object
// Sequelize v6 requires define to be set to prevent initialization errors
const sequelizeConfig = {
  dialect: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'my_fridge_db',
  logging: false, // Set to console.log to see SQL queries
  // CRITICAL: Sequelize v6 requires define to be explicitly set
  // Without this, globalOptions.define will be undefined when models initialize
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false,
  },
  pool: {
    max: 10, // maximum number of connections in pool
    min: 0, // minimum number of connections in pool
    acquire: 30000, // maximum time, in milliseconds, that pool will try to get connection before throwing error
    idle: 10000, // maximum time, in milliseconds, that a connection can be idle before being released
  },
  dialectOptions: {
    connectTimeout: 60000, // connection timeout in milliseconds
    statement_timeout: 30000, // statement timeout in milliseconds
    idle_in_transaction_session_timeout: 30000, // idle in transaction timeout in milliseconds
  },
};

// Create Sequelize instance
const sequelize = new Sequelize(sequelizeConfig);

// CRITICAL FIX: Sequelize v6.37.7 has a bug where globalOptions might not be initialized
// when models call Model.init(). We need to ensure the instance is fully initialized.
// Accessing getDialect() forces Sequelize to set up its internal state including globalOptions
sequelize.getDialect();

export default sequelize;