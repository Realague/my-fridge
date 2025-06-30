@echo off
echo 🐳 Starting My Fridge App in Development Mode...
echo.
echo This will start:
echo   • PostgreSQL Database on port 5432
echo   • Backend API on port 3000  
echo   • Frontend App on port 8080
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Start services
echo 🚀 Starting services...
docker-compose -f docker-compose.dev.yml up --build

echo.
echo 🎉 Development environment started!
echo.
echo Access your app at:
echo   Frontend: http://localhost:8080
echo   Backend:  http://localhost:3000
echo.
echo To stop: Ctrl+C or run 'docker-compose -f docker-compose.dev.yml down'
pause 