import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import migrationRoutes from './routes/migrations';
import householdRoutes from './routes/households';
import itemRoutes from './routes/items';
import storedItemRoutes from './routes/storedItems';
import recipeRoutes from './routes/recipes';
import mealPlanRoutes from './routes/mealPlans';
import imageRoutes from './routes/images';
import { sequelize } from './models';
import { executeSmartMigration } from './utils/migrationStrategy';
import { ItemRepository } from './repositories/ItemRepository';
import { ItemSeeder } from './seeders/defaultItems';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080',
  'https://preview--my-fridge.lovable.app',
  'https://my-fridge.multiplus.ovh',
  'http://my-fridge.multiplus.ovh',
  'http://my-fridge.multiplus.ovh:3000',
];

// In development, allow localhost variations
if (isDevelopment) {
  allowedOrigins.push(
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://0.0.0.0:8080',
    'http://localhost:5173', // Vite default port
    'http://127.0.0.1:5173'
  );
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, be more permissive with localhost
    if (isDevelopment && (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://0.0.0.0:')
    )) {
      return callback(null, true);
    }
    
    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/households', storedItemRoutes);
app.use('/api/items', itemRoutes);
app.use('/api', recipeRoutes);
app.use('/api', mealPlanRoutes);
app.use('/api/images', imageRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'My Fridge API is running! 🚀',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      auth: '/auth',
      migrations: '/api/migrations',
      households: '/api/households',
      storageAreas: '/api/households/:householdId/storage-areas',
      storedItems: '/api/households/:householdId/stored-items',
      recipes: '/api/recipes/:householdId/recipes',
      mealPlans: '/api/households/:householdId/meal-plans',
      items: '/api/items',
      dbTest: '/db-test'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database connection test
app.get('/db-test', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ message: 'Database connection successful!' });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Seed database with default items if empty
async function seedDatabaseIfNeeded(): Promise<void> {
  try {
    const itemRepository = new ItemRepository();
    const itemSeeder = new ItemSeeder(itemRepository);
    
    console.log('🔍 Checking if database seeding is needed...');
    await itemSeeder.seedBasicItems();
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Start server with automatic migrations
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Run smart migrations based on environment
    const result = await executeSmartMigration();
    if (!result.success && result.errors.length > 0) {
      console.warn('⚠️ Migration warnings:', result.errors.join(', '));
    }
    
    // Seed database with default items if needed
    await seedDatabaseIfNeeded();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🗄️  Database Test: http://localhost:${PORT}/db-test`);
      console.log(`🔄 Migration API: http://localhost:${PORT}/api/migrations`);
    });
  } catch (error) {
    console.error('💥 Unable to start server:', error);
    process.exit(1);
  }
}

startServer(); 