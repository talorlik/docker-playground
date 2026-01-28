# Fragment Anchor System

This project uses YAML anchors and aliases with extension fields (`x-swarm`, `x-proxy`) to conditionally select deployment configurations based on the deployment mode (Swarm or Proxy). Additionally, the main `docker-compose.yaml` file uses conditional includes via a placeholder pattern.

## How It Works

### YAML Anchors Pattern

Fragment files use YAML extension fields (`x-`) to define deployment-specific configurations as anchors:

```yaml
x-swarm-ports: &swarm-ports
  ports:
    - target: 8000
      published: 8000

x-proxy-ports: &proxy-ports
  expose:
    - "8000"

services:
  backend:
    <<: *${DEPLOYMENT_MODE}-ports
```

### Supported Fragments

- `backend.yaml` - Backend service configuration with conditional ports and deploy
- `frontend.yaml` - Frontend service configuration with conditional ports and deploy
- `networks-volumes.yaml` - Network definitions with conditional driver selection

### Rendering Script

The `scripts/render-fragments.sh` script replaces anchor references based on deployment mode:

```bash
# Render for Swarm mode
./scripts/render-fragments.sh swarm

# Render for Proxy mode
./scripts/render-fragments.sh proxy
```

The script uses `sed` to replace `*${DEPLOYMENT_MODE}-*` anchor references with the appropriate anchor name (`*swarm-*` or `*proxy-*`).

### Conditional Includes in docker-compose.yaml

The main `docker-compose.yaml` file uses a placeholder pattern for conditional includes:

```yaml
include:
  - fragments/networks-volumes.yaml
  - fragments/databases.yaml
  - fragments/backend.yaml
  - fragments/frontend.yaml
  ${PROXY_INCLUDE}  # Placeholder replaced by render script
```

The render script replaces `${PROXY_INCLUDE}`:
- **Swarm mode**: Removes the placeholder line (proxy.yaml not included)
- **Proxy mode**: Replaces with `  - fragments/proxy.yaml`

This allows a single `docker-compose.yaml` file to work for both deployment modes.

### Setup Scripts Integration

Both setup scripts automatically render fragments before deployment:

- `setup-with-swarm.sh` → Renders fragments for Swarm mode (excludes proxy.yaml)
- `setup-with-proxy.sh` → Renders fragments for Proxy mode (includes proxy.yaml)

## Differences Between Modes

### Swarm Mode
- Uses `overlay` networks
- Exposes ports directly (`ports:` with `published:`)
- Uses `deploy:` sections with Swarm-specific configurations
- Uses `deploy.restart_policy` for restart behavior

### Proxy Mode
- Uses `bridge` networks
- Uses `expose:` instead of `ports:` (no direct host access)
- Uses `restart: unless-stopped` for restart behavior
- Uses `deploy.replicas` for scaling (supported in Docker Compose V2 non-Swarm mode)
- Includes `proxy.yaml` fragment with nginx reverse proxies

## YAML Anchor Syntax

### Extension Fields

Extension fields (`x-`) define reusable configurations:

```yaml
x-swarm-ports: &swarm-ports
  ports:
    - target: 8000
      published: 8000

x-proxy-ports: &proxy-ports
  expose:
    - "8000"
```

### Anchor References

Services reference anchors using the merge key (`<<:`):

```yaml
services:
  backend:
    <<: *${DEPLOYMENT_MODE}-ports
```

The render script replaces `*${DEPLOYMENT_MODE}-ports` with either `*swarm-ports` or `*proxy-ports` based on the deployment mode.

Similarly, the `docker-compose.yaml` file uses a `${PROXY_INCLUDE}` placeholder that gets replaced:
- **Swarm mode**: The placeholder line is removed entirely
- **Proxy mode**: The placeholder is replaced with `  - fragments/proxy.yaml`

## Manual Rendering

To manually render fragments:

```bash
# Using the shell script
./scripts/render-fragments.sh swarm
./scripts/render-fragments.sh proxy
```

## Benefits

1. **Single Source of Truth** - One template file instead of duplicate fragments
2. **Consistency** - Ensures both modes stay in sync
3. **Maintainability** - Changes to common config only need to be made once
4. **Flexibility** - Easy to add new deployment modes in the future
