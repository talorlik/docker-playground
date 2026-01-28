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
echo "Step 1.5: Rendering fragment templates for Swarm mode..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/scripts/render-fragments.sh" swarm
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
docker compose build backend frontend
echo "✓ Images built successfully"
echo ""

# Step 4: Deploy the Stack
echo "Step 4: Deploying the stack..."
echo "Merging compose files..."
docker compose config > docker-compose-merged.yaml

# Fix CPU and port value formats (Docker Stack requirements)
echo "Fixing CPU and port value formats..."
if command -v sed &> /dev/null; then
    # macOS/BSD sed requires -i with an argument (backup extension)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Remove 'name' property (not supported by Docker Stack)
        sed -i '' '/^name:/d' docker-compose-merged.yaml
        # Fix CPU values to be strings
        sed -i '' -E 's/cpus: ([0-9.]+)$/cpus: "\1"/g' docker-compose-merged.yaml
        # Fix port published values to be integers
        sed -i '' -E 's/published: "([0-9]+)"/published: \1/g' docker-compose-merged.yaml
    else
        # Remove 'name' property (not supported by Docker Stack)
        sed -i '/^name:/d' docker-compose-merged.yaml
        # Fix CPU values to be strings
        sed -i -E 's/cpus: ([0-9.]+)$/cpus: "\1"/g' docker-compose-merged.yaml
        # Fix port published values to be integers
        sed -i -E 's/published: "([0-9]+)"/published: \1/g' docker-compose-merged.yaml
    fi
fi

echo "Deploying to swarm..."
docker stack deploy -c docker-compose-merged.yaml myapp
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
