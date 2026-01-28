# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This is a Docker-based high availability (HA) setup demonstrating load balancing,
service replication, and database replication. The project supports **two deployment modes**:

1. **Swarm Mode**: Uses Docker Swarm with overlay networks and built-in load balancing
2. **Proxy Mode**: Uses Docker Compose with nginx reverse proxies for load balancing

The project uses modular Docker Compose fragment files with YAML anchors and conditional
rendering to support both deployment modes from a single set of templates.

## Architecture

Three-tier architecture with network isolation:

- **Frontend Layer**: React app (2 replicas) on port 3000
- **Backend Layer**: Node.js/Express API (3 replicas) on port 8000
- **Database Layer**: PostgreSQL with primary/replica setup on port 5432

Network isolation:

- `frontend-backend-network`: Frontend ↔ Backend communication only
- `backend-db-network`: Backend ↔ Database communication only
- Frontend cannot directly access the database

## Deployment Modes

### Swarm Mode
- Uses Docker Swarm orchestration
- Overlay networks for service communication
- Built-in load balancing via Swarm routing mesh
- No external load balancers needed
- Supports multi-node deployments

### Proxy Mode
- Uses Docker Compose (non-Swarm)
- Bridge networks for service communication
- Nginx reverse proxies for load balancing
- Better for single-host deployments
- Easier to debug and develop with

## Key Commands

### Setup and Deployment

```bash
# Swarm mode setup (builds images, initializes swarm, deploys stack)
./setup-with-swarm.sh

# Proxy mode setup (builds images, starts services with nginx reverse proxies)
./setup-with-proxy.sh

# Remove entire stack and clean up resources
./remove.sh

# Manual Swarm deployment (after editing fragments)
# Note: Fragments are automatically rendered by setup scripts
./scripts/render-fragments.sh swarm
docker compose build
docker compose config > docker-compose-merged.yaml
docker stack deploy -c docker-compose-merged.yaml myapp

# Manual Proxy deployment (after editing fragments)
./scripts/render-fragments.sh proxy
docker compose build
docker compose up -d
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

### Fragment Template System

The project uses **YAML anchors and aliases** with extension fields (`x-swarm`, `x-proxy`)
to support both deployment modes from a single set of fragment templates. Fragment files
are automatically rendered based on the selected deployment mode.

**How it works:**
1. Fragment templates contain YAML anchors for both modes (e.g., `x-swarm-ports`, `x-proxy-ports`)
2. Services reference anchors using `*${DEPLOYMENT_MODE}-ports` placeholder pattern
3. The `render-fragments.sh` script replaces placeholders with actual anchor names
4. Setup scripts automatically render fragments before deployment

See `TEMPLATES.md` for detailed documentation on the fragment anchor system.

### Important: Docker Stack and Include Directive

Docker Stack does **not** support the `include` directive. The `setup-with-swarm.sh`
script handles this by merging fragments:

```bash
docker compose config > docker-compose-merged.yaml
docker stack deploy -c docker-compose-merged.yaml myapp
```

The merged file (`docker-compose-merged.yaml`) is in `.gitignore` and regenerated
on each deployment.

**Important Note**: The `setup-with-swarm.sh` script automatically fixes format
incompatibilities between Docker Compose and Docker Stack:

- Removes the `name` property (not supported by Docker Stack)
- Converts CPU limits to strings (required by Docker Stack)
- Converts port numbers to integers (required by Docker Stack)

### Fragment Files Structure

```bash
docker-compose.yaml              # Main file with conditional includes (${PROXY_INCLUDE} placeholder)
fragments/
  ├── networks-volumes.yaml      # Network and volume definitions (uses anchors for overlay/bridge)
  ├── databases.yaml             # PostgreSQL primary and replica
  ├── backend.yaml               # Backend service (uses anchors for ports/deploy)
  ├── frontend.yaml              # Frontend service (uses anchors for ports/deploy)
  └── proxy.yaml                 # Nginx reverse proxies (included only in Proxy mode)
scripts/
  └── render-fragments.sh        # Renders fragments based on deployment mode (swarm|proxy)
```

### Editing Fragments

1. Edit the specific fragment template file in `fragments/`
2. Render fragments for your deployment mode: `./scripts/render-fragments.sh <swarm|proxy>`
3. Validate: `docker compose config --quiet`
4. Redeploy: `./setup-with-swarm.sh` or `./setup-with-proxy.sh` (scripts auto-render)

**Note**: Fragment templates use YAML anchors. Edit the template values, not the rendered
anchor references. The render script will handle the substitution.

### Adding New Services

1. Create a new fragment file: `fragments/your-service.yaml`
2. Add to `docker-compose.yaml` include list (before `${PROXY_INCLUDE}` placeholder)
3. Add to appropriate network(s)
4. If the service needs mode-specific config, add YAML anchors (see `TEMPLATES.md`)
5. Run `./setup-with-swarm.sh` or `./setup-with-proxy.sh` to deploy

## Service Details

### Backend (Node.js/Express)

- **Port**: 8000
- **Replicas**: 3
- **Health endpoint**: `/health`
- **API endpoints** (Full CRUD):
  - `GET /api/users` - List all users
  - `GET /api/users/:id` - Get single user by ID
  - `POST /api/users` - Create user (validates name, surname, email, optional sex/age)
  - `PUT /api/users/:id` - Update user by ID
  - `DELETE /api/users/:id` - Delete user by ID
- **Database**: Connects to `db-primary` via environment variables
- **Validation**: Email format, age range (0-150), sex values (male/female/other)
- **Error Handling**: Returns proper HTTP status codes (404, 409, 500)

### Frontend (React)

- **Port**: 3000
- **Replicas**: 2
- **API URL**: 
  - Swarm mode: `http://backend:8000` (service discovery)
  - Proxy mode: `http://backend-proxy:8000` (via nginx proxy)
- **Features**:
  - User management UI with full CRUD operations
  - User table with sorting and filtering
  - Modal-based user form for create/edit
  - Toast notifications for success/error feedback
  - Responsive design

### Database (PostgreSQL 15)

- **Primary Port**: 5432 (exposed)
- **Replica**: Internal only, requires manual replication setup
- **Credentials**: postgres/postgres
- **Database**: myapp
- **Tables**: 
  - users (id, name, surname, sex, age, email, created_at)
  - Unique constraint on email field
- **Replication**: WAL-based with replication slot

### Proxy Services (Proxy Mode Only)

- **backend-proxy**: Nginx reverse proxy for backend service
  - Listens on port 8000
  - Load balances across backend replicas
  - Health check: `/health` endpoint
  
- **frontend-proxy**: Nginx reverse proxy for frontend service
  - Listens on port 3000
  - Load balances across frontend replicas
  - Health check: root endpoint

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

### Swarm Mode
- **Frontend**: <http://localhost:3000> (load balanced via Swarm routing mesh)
- **Backend API**: <http://localhost:8000> (load balanced via Swarm routing mesh)
- **Backend Health**: <http://localhost:8000/health>
- **Database**: localhost:5432 (user: postgres, password: postgres, db: myapp)

### Proxy Mode
- **Frontend**: <http://localhost:3000> (via frontend-proxy)
- **Backend API**: <http://localhost:8000> (via backend-proxy)
- **Backend Health**: <http://localhost:8000/health>
- **Database**: localhost:5432 (user: postgres, password: postgres, db: myapp)

## Development Workflow

### Building and Testing Changes

**Swarm Mode:**
```bash
# Render fragments for Swarm mode
./scripts/render-fragments.sh swarm

# Build specific service
docker compose build backend
docker compose build frontend

# Deploy updated service
docker compose config > docker-compose-merged.yaml
docker stack deploy -c docker-compose-merged.yaml myapp

# Verify deployment
docker service ps myapp_backend --no-trunc
```

**Proxy Mode:**
```bash
# Render fragments for Proxy mode
./scripts/render-fragments.sh proxy

# Build specific service
docker compose build backend
docker compose build frontend

# Restart services
docker compose up -d

# Verify deployment
docker compose ps
```

### Rolling Updates

**Swarm Mode:**
```bash
# Update with new image
docker service update --image myapp_backend:new-version myapp_backend

# Add environment variable
docker service update --env-add NEW_VAR=value myapp_backend

# Force update (restart all replicas)
docker service update --force myapp_backend
```

**Proxy Mode:**
```bash
# Update and restart service
docker compose build backend
docker compose up -d --no-deps backend

# Scale service
docker compose up -d --scale backend=5
```

### Rollback

**Swarm Mode:**
```bash
# Rollback to previous version
docker service rollback myapp_backend
```

**Proxy Mode:**
```bash
# Rebuild from previous commit or tag
git checkout <previous-commit>
docker compose build backend
docker compose up -d
```

## Troubleshooting

### Service Not Starting

**Swarm Mode:**
```bash
# Check service events
docker service ps myapp_backend --no-trunc

# View detailed logs
docker service logs myapp_backend --tail 100

# Inspect service configuration
docker service inspect myapp_backend --pretty
```

**Proxy Mode:**
```bash
# Check service status
docker compose ps

# View detailed logs
docker compose logs backend --tail 100

# Inspect container
docker compose exec backend sh
```

### Network Connectivity Issues

**Swarm Mode:**
```bash
# Verify networks exist
docker network ls | grep myapp

# Check which services are on which networks
docker network inspect myapp_backend-db-network
docker network inspect myapp_frontend-backend-network
```

**Proxy Mode:**
```bash
# Verify networks exist
docker network ls | grep docker-playground

# Check which containers are on which networks
docker network inspect docker-playground_backend-db-network
docker network inspect docker-playground_frontend-backend-network
```

### Database Connection Issues

- Backend connects to `db-primary` via network (overlay in Swarm, bridge in Proxy mode)
- Check environment variables in `fragments/backend.yaml`
- **Swarm Mode**:
  - Verify database is healthy: `docker service ps myapp_db-primary`
  - Check logs: `docker service logs myapp_db-primary`
- **Proxy Mode**:
  - Verify database is healthy: `docker compose ps db-primary`
  - Check logs: `docker compose logs db-primary`

### Volume Issues

**Swarm Mode:**
```bash
# List volumes
docker volume ls | grep myapp

# Inspect volume
docker volume inspect myapp_postgres_primary_data
```

**Proxy Mode:**
```bash
# List volumes
docker volume ls | grep docker-playground

# Inspect volume
docker volume inspect docker-playground_postgres_primary_data
```

### Switching Between Modes

To switch from one deployment mode to another:

1. **Stop current deployment:**
   - Swarm: `./remove.sh` or `docker stack rm myapp`
   - Proxy: `docker compose down`

2. **Render fragments for new mode:**
   ```bash
   ./scripts/render-fragments.sh <swarm|proxy>
   ```

3. **Deploy in new mode:**
   - Swarm: `./setup-with-swarm.sh`
   - Proxy: `./setup-with-proxy.sh`

**Note**: Volumes are preserved when switching modes if you don't use `-v` flag.

## Security Practices

When generating new code:

- Run Snyk code scans on new first-party code (see `.cursor/rules/snyk_rules.mdc`)
- Fix security issues found in newly introduced/modified code
- Rescan after fixes until no issues remain
- Never commit secrets or credentials to the repository
- Use environment variables for sensitive configuration

## Notes

- The PostgreSQL replica requires manual setup with `pg_basebackup`
- **Swarm Mode**: Routing mesh provides built-in load balancing (round-robin)
- **Proxy Mode**: Nginx proxies provide load balancing
- Service discovery works via service names (e.g., `backend`, `db-primary`)
- Network isolation ensures frontend cannot directly access database
- The merged compose file (`docker-compose-merged.yaml`) is auto-generated and should not be committed
- Fragment files are rendered based on deployment mode - edit templates, not rendered files
- Both modes support scaling, but Proxy mode is simpler for single-host development
- See `TEMPLATES.md` for details on the fragment anchor system
- See `CHANGELOG.md` for version history and detailed change log
