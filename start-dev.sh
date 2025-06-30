#!/bin/bash

echo "🐳 Starting My Fridge App in Development Mode..."
echo ""
echo "This will start:"
echo "  • PostgreSQL Database on port 5432"
echo "  • Backend API on port 3000"
echo "  • Frontend App on port 8080"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.dev.yml up --build

echo ""
echo "🎉 Development environment started!"
echo ""
echo "Access your app at:"
echo "  Frontend: http://localhost:8080"
echo "  Backend:  http://localhost:3000"
echo ""
echo "To stop: Ctrl+C or run 'docker-compose -f docker-compose.dev.yml down'" 