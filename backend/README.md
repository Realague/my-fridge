# My Fridge Backend

A TypeScript-based backend API using Express.js, Sequelize ORM, and PostgreSQL.

## Tech Stack

- **Node.js** - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web framework
- **Sequelize** - ORM for database operations
- **PostgreSQL** - Database
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # Sequelize configuration (TypeScript)
│   └── database.js  # Sequelize configuration (JavaScript for CLI)
├── models/          # Database models
│   ├── index.ts     # Models export and initialization
│   └── User.ts      # Example User model
├── routes/          # API routes
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── migrations/      # Database migrations
├── seeders/         # Database seeders
└── index.ts         # Main application entry point
```

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   - Copy `env.example` to `.env`
   - Update the database credentials and other environment variables

3. **Database Setup:**
   ```bash
   # Create database (optional, if using Sequelize CLI)
   npm run db:create
   
   # Run migrations (when you create them)
   npm run db:migrate
   
   # Run seeders (when you create them)
   npm run db:seed
   ```

4. **Development:**
   ```bash
   # Start development server with hot reload
   npm run dev
   
   # Build TypeScript to JavaScript
   npm run build
   
   # Start production server
   npm start
   ```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:create` - Create database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Run database seeders

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint
- `GET /db-test` - Database connection test

## Environment Variables

Create a `.env` file based on `env.example`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_fridge_db
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
```

## Database Models

The project includes a sample `User` model to demonstrate the Sequelize TypeScript pattern. You can create additional models following the same structure.

## Contributing

1. Create feature branches
2. Follow TypeScript and ESLint conventions
3. Test database connections before committing
4. Update documentation as needed 