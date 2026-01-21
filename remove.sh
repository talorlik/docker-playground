#!/bin/bash

# Don't exit on error - we want to clean up as much as possible
set +e

echo "========================================="
echo "Removing Docker Stack and Resources"
echo "========================================="
echo ""

# Step 1: Remove the stack
echo "Step 1: Removing Docker stack 'myapp'..."
docker stack rm myapp

echo "✓ Stack removal initiated"
echo ""
echo "Waiting for services to stop..."
sleep 10

# Wait a bit more to ensure everything is stopped
echo "Verifying stack removal..."
for i in {1..6}; do
    if ! docker stack ls 2>/dev/null | grep -q "myapp"; then
        echo "✓ Stack removed successfully"
        break
    fi
    sleep 5
    echo "  Waiting for stack to be fully removed... ($i/6)"
done
echo ""

# Step 2: Remove volumes
echo "Step 2: Removing volumes..."
VOLUMES=("myapp_postgres_primary_data" "myapp_postgres_replica_data")

for volume in "${VOLUMES[@]}"; do
    if docker volume ls 2>/dev/null | grep -q "$volume"; then
        echo "  Removing volume: $volume"
        if docker volume rm "$volume" 2>/dev/null; then
            echo "    ✓ Volume removed"
        else
            echo "    ⚠ Volume may be in use or already removed"
        fi
    else
        echo "  Volume $volume not found (already removed or never created)"
    fi
done
echo ""

# Step 3: Clean up networks (they should be removed automatically, but check)
echo "Step 3: Checking for leftover networks..."
NETWORKS=("myapp_backend-db-network" "myapp_frontend-backend-network")

for network in "${NETWORKS[@]}"; do
    if docker network ls 2>/dev/null | grep -q "$network"; then
        echo "  Removing network: $network"
        if docker network rm "$network" 2>/dev/null; then
            echo "    ✓ Network removed"
        else
            echo "    ⚠ Network may be in use or already removed"
        fi
    else
        echo "  Network $network not found (already removed or never created)"
    fi
done
echo ""

# Step 4: Summary
echo "========================================="
echo "Cleanup Complete!"
echo "========================================="
echo ""
echo "Removed resources:"
echo "  ✓ Stack services"
echo "  ✓ Stack networks"
echo "  ✓ Stack volumes"
echo ""
echo "Note: Docker images (myapp-backend:latest, myapp-frontend:latest) were not removed."
echo "      To remove images, run:"
echo "        docker rmi myapp-backend:latest myapp-frontend:latest"
echo ""
echo "To verify cleanup:"
echo "  docker stack ls"
echo "  docker volume ls"
echo "  docker network ls"
echo ""
