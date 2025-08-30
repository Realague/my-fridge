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
import { sequelize } from './models';
import { executeSmartMigration } from './utils/migrationStrategy';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://preview--my-fridge.lovable.app',
    'https://30fb01b8fdbc.ngrok-free.app',
    'https://2b14-2a01-cb10-8dc5-8e00-7e31-6dd7-fe4f-90f5.ngrok-free.app',
  ],
  credentials: true
}));

// Add ngrok bypass header middleware
app.use((req, res, next) => {
  res.header('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/households', storedItemRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api', mealPlanRoutes);

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