# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This is a Docker Swarm-based high availability (HA) setup demonstrating load balancing,
service replication, and database replication. It uses modular Docker Compose fragment
files that are merged for Swarm deployment.

## Architecture

Three-tier architecture with network isolation:

- **Frontend Layer**: React app (2 replicas) on port 3000
- **Backend Layer**: Node.js/Express API (3 replicas) on port 8000
- **Database Layer**: PostgreSQL with primary/replica setup on port 5432

Network isolation:

- `frontend-backend-network`: Frontend ↔ Backend communication only
- `backend-db-network`: Backend ↔ Database communication only
- Frontend cannot directly access the database

## Key Commands

### Setup and Deployment

```bash
# Complete setup (builds images, initializes swarm, deploys stack)
./setup.sh

# Remove entire stack and clean up resources
./remove.sh

# Manual deployment (after editing fragments)
docker compose build
docker compose config > docker-compose-merged.yaml
docker stack deploy -c docker-compose-merged.yaml myapp
```

### Monitoring and Management

```bash
# View all services status
docker stack services myapp

# View detailed task status
docker stack ps myapp

# View logs
docker service logs -f myapp_backend
docker service logs -f myapp_frontend
docker service logs -f myapp_db-primary

# Scale services
docker service scale myapp_backend=5
docker service scale myapp_frontend=3

# View resource usage
docker stats
```

### Swarm Management

```bash
# Initialize swarm (if needed)
docker swarm init

# Get worker join token
docker swarm join-token worker

# View swarm nodes
docker node ls
```

### Validation

```bash
# Validate compose configuration
docker compose config --quiet

# View merged configuration
docker compose config
```

## Compose Fragment System

### Important: Docker Stack and Include Directive

Docker Stack does **not** support the `include` directive. The `setup.sh` script
handles this by merging fragments:

```bash
docker compose config > docker-compose-merged.yaml
docker stack deploy -c docker-compose-merged.yaml myapp
```

The merged file (`docker-compose-merged.yaml`) is in `.gitignore` and regenerated
on each deployment.

**Important Note**: The `setup.sh` script automatically fixes format incompatibilities between Docker Compose and Docker Stack:
- Removes the `name` property (not supported by Docker Stack)
- Converts CPU limits to strings (required by Docker Stack)
- Converts port numbers to integers (required by Docker Stack)

### Fragment Files Structure

```bash
docker-compose.yaml              # Main file with include directives
fragments/
  ├── networks-volumes.yaml      # Network and volume definitions
  ├── databases.yaml             # PostgreSQL primary and replica
  ├── backend.yaml               # Backend service (3 replicas)
  └── frontend.yaml              # Frontend service (2 replicas)
```

### Editing Fragments

1. Edit the specific fragment file in `fragments/`
2. Validate: `docker compose config --quiet`
3. Redeploy: `./setup.sh` or manually merge and deploy

### Adding New Services

1. Create a new fragment file: `fragments/your-service.yaml`
2. Add to `docker-compose.yaml` include list
3. Add to appropriate network(s)
4. Run `./setup.sh` to deploy

## Service Details

### Backend (Node.js/Express)

- **Port**: 8000
- **Replicas**: 3
- **Health endpoint**: `/health`
- **API endpoints**:
  - `GET /api/users` - List all users
  - `POST /api/users` - Create user (validates name, surname, email, optional sex/age)
- **Database**: Connects to `db-primary` via environment variables
- **Validation**: Email format, age range (0-150), sex values (male/female/other)

### Frontend (React)

- **Port**: 3000
- **Replicas**: 2
- **API URL**: `http://backend:8000` (service discovery)

### Database (PostgreSQL 15)

- **Primary Port**: 5432 (exposed)
- **Replica**: Internal only, requires manual replication setup
- **Credentials**: postgres/postgres
- **Database**: myapp
- **Tables**: users (id, name, surname, sex, age, email, created_at)
- **Replication**: WAL-based with replication slot

## Placement Constraints

- **Database services**: Manager nodes only
- **Backend/Frontend**: Manager nodes only (in current config)
- Modify `deploy.placement.constraints` in fragments to use worker nodes

## Resource Limits

All application services (backend/frontend):

- **Limits**: 0.5 CPU, 512MB RAM
- **Reservations**: 0.25 CPU, 256MB RAM

## Update Strategy

- **Parallelism**: 1 (one container at a time)
- **Delay**: 10s between updates
- **Failure Action**: Automatic rollback
- **Monitor**: 60s health check window

## Health Checks

All services have health checks with:

- 10s interval
- 5s timeout
- 3-5 retries
- 30-60s start period

## Access Points

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000>
- **Backend Health**: <http://localhost:8000/health>
- **Database**: localhost:5432 (user: postgres, password: postgres, db: myapp)

## Development Workflow

### Building and Testing Changes

```bash
# Build specific service
docker compose build backend
docker compose build frontend

# Deploy updated service
docker compose config > docker-compose-merged.yaml
docker stack deploy -c docker-compose-merged.yaml myapp

# Verify deployment
docker service ps myapp_backend --no-trunc
```

### Rolling Updates

```bash
# Update with new image
docker service update --image myapp_backend:new-version myapp_backend

# Add environment variable
docker service update --env-add NEW_VAR=value myapp_backend

# Force update (restart all replicas)
docker service update --force myapp_backend
```

### Rollback

```bash
# Rollback to previous version
docker service rollback myapp_backend
```

## Troubleshooting

### Service Not Starting

```bash
# Check service events
docker service ps myapp_backend --no-trunc

# View detailed logs
docker service logs myapp_backend --tail 100

# Inspect service configuration
docker service inspect myapp_backend --pretty
```

### Network Connectivity Issues

```bash
# Verify networks exist
docker network ls | grep myapp

# Check which services are on which networks
docker network inspect myapp_backend-db-network
docker network inspect myapp_frontend-backend-network
```

### Database Connection Issues

- Backend connects to `db-primary` via overlay network
- Check environment variables in `fragments/backend.yaml`
- Verify database is healthy: `docker service ps myapp_db-primary`
- Check logs: `docker service logs myapp_db-primary`

### Volume Issues

```bash
# List volumes
docker volume ls | grep myapp

# Inspect volume
docker volume inspect myapp_postgres_primary_data
```

## Security Practices

When generating new code:

- Run Snyk code scans on new first-party code (see `.cursor/rules/snyk_rules.mdc`)
- Fix security issues found in newly introduced/modified code
- Rescan after fixes until no issues remain
- Never commit secrets or credentials to the repository
- Use environment variables for sensitive configuration

## Notes

- The PostgreSQL replica requires manual setup with `pg_basebackup`
- Swarm routing mesh provides built-in load balancing (round-robin)
- Service discovery works via service names (e.g., `backend`, `db-primary`)
- Network isolation ensures frontend cannot directly access database
- The merged compose file is auto-generated and should not be committed
