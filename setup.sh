#!/bin/bash

set -e  # Exit on error

echo "========================================="
echo "Docker Swarm Setup Script"
echo "========================================="
echo ""

# Step 1: Verify Docker Installation
echo "Step 1: Verifying Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

docker --version
if docker compose version &> /dev/null; then
    docker compose version
else
    docker-compose --version
fi
echo "✓ Docker is installed and ready"
echo ""

# Step 2: Initialize Docker Swarm
echo "Step 2: Initializing Docker Swarm..."
if ! docker info | grep -q "Swarm: active"; then
    echo "Initializing Docker Swarm..."
    docker swarm init
    echo "✓ Docker Swarm initialized!"
    echo ""
    echo "To add worker nodes, run this command on worker machines:"
    docker swarm join-token worker 2>/dev/null | grep "docker swarm join" || docker swarm join-token worker
else
    echo "✓ Docker Swarm is already initialized"
    echo ""
    echo "To add worker nodes, run this command on worker machines:"
    docker swarm join-token worker 2>/dev/null | grep "docker swarm join" || docker swarm join-token worker
fi
echo ""

# Step 3: Build Docker Images
echo "Step 3: Building Docker images..."
if docker compose version &> /dev/null; then
    docker compose build backend frontend
else
    docker-compose build backend frontend
fi
echo "✓ Images built successfully"
echo ""

# Step 4: Deploy the Stack
echo "Step 4: Deploying the stack..."
docker stack deploy -c docker-compose.yaml myapp
echo "✓ Stack deployed"
echo ""

# Step 5: Wait for services to start
echo "Step 5: Waiting for services to start (this may take 30-60 seconds)..."
sleep 10
echo "Checking service status..."
for i in {1..6}; do
    sleep 10
    RUNNING=$(docker stack services myapp --format "{{.Replicas}}" | grep -c "1/1\|2/2\|3/3" || true)
    TOTAL=$(docker stack services myapp --format "{{.Name}}" | wc -l | tr -d ' ')
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
docker stack services myapp
echo ""

echo "Detailed task status:"
docker stack ps myapp
echo ""

# Step 7: Display Access Information
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Access your application:"
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:8000"
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
echo "  View services:    docker stack services myapp"
echo "  View logs:       docker service logs -f myapp_backend"
echo "  Remove stack:    docker stack rm myapp"
echo ""
