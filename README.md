# High Availability Docker Swarm Setup

This setup provides a high availability (HA) configuration using Docker Swarm mode with load balancing, multiple service replicas, and database replication.

## Architecture

```ascii
┌─────────────────────────────────────────────────────────────────────────┐
│                          External Users                                 │
└─────────────────────┬────────────────────────┬──────────────────────────┘
                      │                        │
                      │ HTTP :3000             │ HTTP :8000
                      ▼                        ▼
        ┌─────────────────────────┐  ┌─────────────────────────┐
        │   Swarm Routing Mesh    │  │   Swarm Routing Mesh    │
        │   (Load Balancer)       │  │   (Load Balancer)       │
        └─────────────┬───────────┘  └───────────┬─────────────┘
                      │                          │
        ┌─────────────┴──────────────┐           │
        │                            │           │
┌───────▼────────┐          ┌────────▼──────┐    │
│   Frontend     │          │   Frontend    │    │
│   Replica 1    │          │   Replica 2   │    │
│                │          │               │    │
└───────┬────────┘          └────────┬──────┘    │
        │                            │           │
        └────────────┬───────────────┘           │
                     │                           │
              ┌──────▼───────────────────────────────────────────┐
              │   frontend-backend-network (overlay)             │
              └──────┬───────────────────────────────────────────┘
                     │
        ┌────────────┼─────────────┬──────────────┐
        │            │             │              │
┌───────▼────────┐ ┌─▼──────────┐ ┌▼────────────┐ │
│   Backend      │ │  Backend   │ │  Backend    │ │
│   Replica 1    │ │  Replica 2 │ │  Replica 3  │ │
│                │ │            │ │             │ │
└───────┬────────┘ └─┬──────────┘ └┬────────────┘ │
        │            │             │              │
        └────────────┼─────────────┴──────────────┘
                     │
              ┌──────▼─────────────────────────────────────────┐
              │   backend-db-network (overlay)                 │
              └──────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
┌───────▼────────┐        ┌────────▼──────────┐
│  PostgreSQL    │        │   PostgreSQL      │
│  Primary       │───────▶│   Read Replica    │
│  :5432         │  sync  │   (internal)      │
└────────────────┘        └───────────────────┘

Legend:
  ───▶  Data flow / Communication
  ┌──┐  Service boundary
  │  │  Network isolation layer
```

### Services

1. **Database Layer**
   - `db-primary`: PostgreSQL primary database (1 replica)
   - `db-replica`: PostgreSQL read replica (1 replica, requires manual replication setup)

2. **Backend Layer**
   - `backend`: Backend service with 3 replicas (load balanced by Swarm routing mesh)

3. **Frontend Layer**
   - `frontend`: Frontend service with 2 replicas (load balanced by Swarm routing mesh)

### Network Isolation

- **backend-db-network**: Only database and backend services (overlay network)
- **frontend-backend-network**: Frontend and backend services (overlay network)

This ensures:

- ✅ Backend can access database
- ✅ Frontend can access backend (via service name)
- ❌ Frontend cannot directly access database

## Project Structure

This project uses a modular Docker Compose configuration with fragments for better organization and maintainability:

```bash
docker-playground/
├── docker-compose.yaml             # Main compose file (uses include)
├── fragments/                      # Compose fragments
│   ├── networks-volumes.yaml       # Network and volume definitions
│   ├── databases.yaml              # PostgreSQL primary and replica
│   ├── backend.yaml                # Backend service configuration
│   └── frontend.yaml               # Frontend service configuration
├── backend/                        # Backend application code
├── frontend/                       # Frontend application code
└── db/                             # Database initialization scripts
```

### Compose File Fragments

The `docker-compose.yaml` file uses the `include` directive (Docker Compose v2.20+) to merge multiple fragment files:

- **networks-volumes.yaml**: Defines all shared networks and persistent volumes
- **databases.yaml**: PostgreSQL primary and read replica configurations
- **backend.yaml**: Backend service with 3 replicas
- **frontend.yaml**: Frontend service with 2 replicas

**Benefits:**

- ✅ Modular configuration - each service in its own file
- ✅ Easier to maintain and update individual services
- ✅ Better version control - smaller, focused diffs
- ✅ Reusable fragments across different environments

## Docker Swarm Features

- **Built-in Load Balancing**: Swarm's routing mesh automatically distributes traffic across replicas
- **Service Discovery**: Services can reach each other by service name
- **Health Checks**: All services have health check endpoints
- **Auto-restart**: Services restart automatically on failure
- **Rolling Updates**: Zero-downtime updates with rollback capability
- **Resource Limits**: CPU and memory constraints for each service

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.20 or later (required for `include` directive)
- At least 2GB of available RAM
- Ports 3000, 8000, and 5432 available

## Step-by-Step Setup Instructions

### Quick Start (Recommended)

The easiest way to set up everything is to run the all-in-one setup script:

```bash
./setup.sh
```

This script will:

- Verify Docker installation
- Initialize Docker Swarm (if not already initialized)
- Build the backend and frontend images
- Deploy the entire stack
- Wait for services to start
- Display service status and access information

### Verify Deployment

Check the status of your services:

```bash
# Check all services in the stack
docker stack services myapp

# Check detailed status of all tasks
docker stack ps myapp

# View logs to ensure services are starting correctly
docker service logs myapp_backend
docker service logs myapp_frontend
docker service logs myapp_db-primary
```

**Expected Output:**

You should see:

- `myapp_db-primary`: 1/1 replicas running
- `myapp_db-replica`: 1/1 replicas running
- `myapp_backend`: 3/3 replicas running
- `myapp_frontend`: 2/2 replicas running

### Access the Application

Once all services are running, you can access:

- **Frontend**: Open your browser and navigate to [http://localhost:3000](http://localhost:3000)
- **Backend API**: Access the API at [http://localhost:8000](http://localhost:8000)
  - Health check endpoint: [http://localhost:8000/health](http://localhost:8000/health)
- **Database**: Connect to PostgreSQL at `localhost:5432`
  - Username: `postgres`
  - Password: `postgres`
  - Database: `myapp`

### Adding Worker Nodes (Optional)

The `setup.sh` script automatically displays the worker node join command after initializing the swarm. If you need to get it again later, run:

```bash
docker swarm join-token worker
```

Copy the output command and run it on each worker node.

### Monitor Services

Monitor the services in real-time:

```bash
# Watch service status
watch docker stack services myapp

# View resource usage
docker stats

# Follow logs from all services
docker service logs -f myapp_backend
docker service logs -f myapp_frontend
```

## Available Scripts

The following bash scripts are available to help you manage the Docker Swarm setup:

- **`setup.sh`** - Complete all-in-one setup script (recommended)
  - Verifies Docker installation
  - Initializes Docker Swarm
  - Builds images
  - Deploys the stack
  - Waits for services to start
  - Displays status and access information

- **`remove.sh`** - Remove the Docker stack
  - Removes all services and resources
  - Cleans up the stack deployment

## Working with Compose Fragments

### Validating the Configuration

After making changes to any fragment file, validate the merged configuration:

```bash
# Validate syntax
docker compose config --quiet

# View the merged configuration
docker compose config
```

### Editing Fragments

To modify a specific service, edit its corresponding fragment file:

```bash
# Edit backend configuration
vim fragments/backend.yaml

# Edit database settings
vim fragments/databases.yaml

# Edit network or volume definitions
vim fragments/networks-volumes.yaml
```

### Adding New Services

To add a new service:

1. Create a new fragment file in the `fragments/` directory
2. Add the service definition
3. Update `docker-compose.yaml` to include the new fragment:

```yaml
include:
  - fragments/networks-volumes.yaml
  - fragments/databases.yaml
  - fragments/backend.yaml
  - fragments/frontend.yaml
  - fragments/your-new-service.yaml
```

### Deploying Changes

After editing fragments, redeploy the stack:

```bash
# Build updated images
docker compose build

# Deploy the updated stack
docker stack deploy -c docker-compose.yaml myapp
```

## Usage

### View stack services

```bash
docker stack services myapp
```

### View service replicas

```bash
docker service ps myapp_backend
docker service ps myapp_frontend
```

### Scale services

```bash
# Scale backend to 5 replicas
docker service scale myapp_backend=5

# Scale frontend to 3 replicas
docker service scale myapp_frontend=3
```

### View logs

```bash
# All services
docker service logs -f myapp_backend

# Specific replica
docker service logs -f myapp_backend --tail 100
```

### Update a service

```bash
# Update backend image
docker service update --image myapp_backend:new-version myapp_backend

# Update with new environment variable
docker service update --env-add NEW_VAR=value myapp_backend
```

### Remove the stack

You can use the provided script:

```bash
./remove.sh
```

Or manually:

```bash
docker stack rm myapp
```

## Access Points

- **Frontend**: <http://localhost:3000> (load balanced across 2 replicas)
- **Backend API**: <http://localhost:8000> (load balanced across 3 replicas)
- **Database**: localhost:5432 (primary only, replica is internal)

## Load Balancing

Docker Swarm's routing mesh provides built-in load balancing:

- Traffic to published ports is automatically distributed across all replicas
- Uses round-robin algorithm by default
- No need for external load balancers (nginx, etc.)

## Health Checks

All services expose health check endpoints:

- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000/` (root endpoint)

Swarm monitors health checks and automatically:

- Removes unhealthy containers from the load balancer
- Restarts failed containers
- Maintains desired replica count

## Deployment Configuration

### Replicas

- **Backend**: 3 replicas (configurable via `deploy.replicas`)
- **Frontend**: 2 replicas (configurable via `deploy.replicas`)
- **Database**: 1 replica each (primary and replica)

### Update Strategy

- **Parallelism**: 1 (update one container at a time)
- **Delay**: 10s between updates
- **Failure Action**: Automatic rollback on failure
- **Monitor**: 60s health check window

### Resource Limits

- **Backend**: 0.5 CPU, 512MB memory limit
- **Frontend**: 0.5 CPU, 512MB memory limit
- **Reservations**: 0.25 CPU, 256MB memory guaranteed

### Placement Constraints

- **Database**: Manager nodes only
- **Backend/Frontend**: Worker nodes only

## Monitoring

### Check service status

```bash
docker stack ps myapp
```

### View service details

```bash
docker service inspect myapp_backend
```

### Monitor resource usage

```bash
docker stats
```

## Database Replication Setup

The PostgreSQL replica requires manual setup. After deploying the stack:

1. The primary database will be initialized with replication user
2. You'll need to manually configure the replica using `pg_basebackup` or similar tools
3. For production, consider using managed PostgreSQL services or tools like Patroni

## Troubleshooting

### View service events

```bash
docker service events myapp_backend
```

### Inspect a failed service

```bash
docker service inspect myapp_backend --pretty
```

### Force service update

```bash
docker service update --force myapp_backend
```

### Check network connectivity

```bash
docker service logs myapp_backend | grep -i error
```
