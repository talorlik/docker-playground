#!/bin/bash

set -e  # Exit on error

echo "========================================="
echo "Docker Compose with Reverse Proxy Setup"
echo "========================================="
echo ""

# Step 1: Verify Docker Installation
echo "Step 1: Verifying Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose V2 is not installed. Please install Docker Compose V2 first."
    echo "Docker Compose V2 is included with Docker Desktop or can be installed as a plugin."
    exit 1
fi

docker --version
docker compose version
echo "✓ Docker and Docker Compose V2 are installed and ready"
echo ""

# Step 1.5: Render fragment templates
echo "Step 1.5: Rendering fragment templates for Proxy mode..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/scripts/render-fragments.sh" proxy
echo ""

# Step 2: Build Docker Images
echo "Step 2: Building Docker images..."
docker compose build backend frontend
echo "✓ Images built successfully"
echo ""

# Step 3: Start Services
echo "Step 3: Starting services with reverse proxy..."
echo "Note: Replicas are defined in deploy.replicas (Backend: 3, Frontend: 2)"
docker compose up -d
echo "✓ Services started with configured replicas"
echo ""

# Step 5: Wait for services to start
echo "Step 5: Waiting for services to start (this may take 30-60 seconds)..."
sleep 10
echo "Checking service status..."
for i in {1..6}; do
    sleep 10
    RUNNING=$(docker compose ps --services --filter "status=running" | wc -l | tr -d ' ')
    TOTAL=$(docker compose ps --services | wc -l | tr -d ' ')
    if [ "$RUNNING" -eq "$TOTAL" ]; then
        echo "✓ All services are running!"
        break
    fi
    echo "  Waiting... ($i/6)"
done
echo ""

# Step 6: Display Status
echo "Step 6: Service Status"
echo "========================================="
docker compose ps
echo ""

# Step 7: Display Access Information
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Access your application:"
echo "  Frontend:     http://localhost:3000 (via frontend-proxy)"
echo "  Backend API:  http://localhost:8000 (via backend-proxy)"
echo "  Health Check: http://localhost:8000/health"
echo ""
echo "Database connection:"
echo "  Host:     localhost"
echo "  Port:     5432"
echo "  Username: postgres"
echo "  Password: postgres"
echo "  Database: myapp"
echo ""
echo "Useful commands:"
echo "  View services:    docker compose ps"
echo "  View logs:       docker compose logs -f backend"
echo "  Stop services:   docker compose down"
echo "  Scale backend:   docker compose up -d --scale backend=N"
echo "  Scale frontend:  docker compose up -d --scale frontend=N"
echo ""
echo ""
