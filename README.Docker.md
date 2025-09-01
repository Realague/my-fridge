# Docker Setup for My Fridge App

This project includes Docker Compose configurations to easily run the entire application stack including the database, backend API, and frontend.

## Services

- **Database**: PostgreSQL 15
- **Backend**: Node.js/TypeScript API server
- **Frontend**: React/Vite development server

## Quick Start

### Development Mode (Recommended for Development)

```bash
# Start all services in development mode with hot reloading
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode (background)
docker-compose -f docker-compose.dev.yml up --build -d
```

### Production Mode

```bash
# Start all services in production mode
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

## Service URLs

Once running, you can access:

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432
  - Username: `postgres`
  - Password: `postgres`
  - Database: `my_fridge_db`

## Development Features

The development setup includes:

- **Hot Reloading**: Both frontend and backend automatically reload on code changes
- **Debug Support**: Backend debug port exposed on 9229
- **Volume Mounting**: Source code is mounted for instant updates
- **Auto Migration**: Database migrations run automatically on backend startup

## Useful Commands

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clears database)
docker-compose -f docker-compose.dev.yml down -v

# View logs
docker-compose -f docker-compose.dev.yml logs

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs frontend
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs db

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build frontend

# Run backend shell for debugging
docker-compose -f docker-compose.dev.yml exec backend sh

# Run database shell
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db
```

## Database Management

### Migrations

The backend automatically runs migrations on startup in development mode. For manual migration management:

```bash
# Run migrations manually
docker-compose -f docker-compose.dev.yml exec backend npm run db:migrate

# Rollback last migration
docker-compose -f docker-compose.dev.yml exec backend npm run db:migrate:undo

# Check migration status
docker-compose -f docker-compose.dev.yml exec backend npm run db:migrate:status
```

### Database Reset

To completely reset the database:

```bash
# Stop services and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Start services again (fresh database)
docker-compose -f docker-compose.dev.yml up --build
```

## Troubleshooting

### Port Conflicts

If you get port conflicts, you can modify the ports in the docker-compose files:

```yaml
ports:
  - "3000:3000"  # Change local port from 3000 to 3001
```

### Database Connection Issues

1. Make sure the database service is healthy:
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

2. Check database logs:
   ```bash
   docker-compose -f docker-compose.dev.yml logs db
   ```

3. Test database connection:
   ```bash
   docker-compose -f docker-compose.dev.yml exec db pg_isready -U postgres
   ```

### Frontend Build Issues

If the frontend fails to build:

1. Clear node_modules and rebuild:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up --build --force-recreate frontend
   ```

### Backend Issues

If the backend fails to start:

1. Check backend logs:
   ```bash
   docker-compose -f docker-compose.dev.yml logs backend
   ```

2. Verify database connection and run migrations:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npm run db:migrate:status
   ```

## Environment Variables

You can override environment variables by creating a `.env` file in the root directory:

```env
# Database
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=my_fridge_db

# Backend
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000
```

## Production Deployment

For production deployment, use the main `docker-compose.yml` file which:

- Builds optimized production builds
- Removes development dependencies
- Includes health checks
- Optimizes for performance over development convenience

```bash
# Production deployment
docker-compose up --build -d
``` 