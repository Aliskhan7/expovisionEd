#!/bin/bash

# ExpoVisionED Docker Startup Script

echo "🚀 Starting ExpoVisionED Platform..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env file and add your OpenAI API key!"
    echo "   Then run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Initialize database if needed
echo "📊 Initializing database..."
docker-compose exec backend python -m app.db.init_db

echo "✅ ExpoVisionED is ready!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "👤 Demo accounts:"
echo "   Student: student@test.com / student123"
echo "   Admin: admin@expovision.ed / admin123"
echo ""
echo "🛑 To stop: docker-compose down"

