#!/bin/bash

# ExpoVisionED Docker Stop Script

echo "🛑 Stopping ExpoVisionED Platform..."

# Stop all services
docker-compose down

echo "✅ ExpoVisionED stopped successfully!"
echo ""
echo "💡 To remove all data (including database):"
echo "   docker-compose down -v"
echo ""
echo "🧹 To clean up Docker images:"
echo "   docker system prune -f"

