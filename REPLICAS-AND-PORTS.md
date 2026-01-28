# Replicas and port assignment: Swarm vs Compose

This document describes how multiple container replicas interact with published
ports in this project, and the differences between Docker Swarm and
Docker Compose V2.

It answers:

1. Why you cannot always "run N replicas and give each its own host port",
especially on Docker Desktop (Mac/Windows)?
2. How to run multiple replicas with one port each when not using Swarm?
3. Port range behavior in Compose V2 and Swarm.

> [!NOTE]
>
> This project requires Docker Compose V2. Compose V1 is legacy and not supported.

**Platform coverage:** Most content applies to **Linux, macOS, and Windows**.
The main platform-specific differences are in Swarm `mode: host` behavior (section
2): it works perfectly on **Linux**, but has limitations on **Mac and Windows**
when using Docker Desktop due to VM-based architecture.

## Terms and scope

**In this document:**

- **Replicas** = multiple containers from the same service (same image, same config),
e.g. three backend tasks behind one service name.
- **Respective ports** / **one port per replica** = each replica gets its own
host port (e.g. replica 1 → 8000, replica 2 → 8001, replica 3 → 8002), instead of
all sharing one port or getting random ephemeral ports.
- **Swarm** = this project's default: `setup-with-swarm.sh` runs `docker swarm init`
and `docker stack deploy`.
- **Compose (standalone)** = `docker compose up` **without** initializing or using
a swarm. Uses Docker Compose V2. Scale can come from `--scale backend=N` or from
`deploy.replicas: N` in the compose file; port behaviour is the same either way.
- **Linux** = native Docker on Linux (daemon runs directly on the host). Swarm
  `mode: host` works perfectly.
- **Docker Desktop** = Docker Desktop on macOS or Windows, where the daemon runs
  inside a Linux VM (Hyper-V on Windows, or WSL2). Swarm `mode: host` limitations
  apply (see section 2).

## 1. Swarm: one port per service, not per replica

**Applies to:** Linux, macOS, Windows (all platforms)

The stack uses **ingress** publishing (the default in Swarm). For example, in `fragments/backend.yaml`:

```yaml
ports:
  - target: 8000
    published: 8000
    protocol: tcp
    mode: ingress
deploy:
  replicas: 3
```

With `mode: ingress`:

- **One** host port (e.g. 8000) is published for the whole service.
- The **routing mesh** (Swarm’s built-in layer‑4 load balancer) binds to that
  port. **No container** binds to the host port; only the mesh does.
- Each replica listens on its **container** port (e.g. 8000) inside the overlay
  network. When traffic hits the host port, the mesh accepts it and **forwards**
  connections to one of the healthy tasks (round‑robin or similar).
- You do **not** get "replica 1 → 8000, replica 2 → 8001, replica 3 → 8002."
- You get "host port 8000 → routing mesh → any of the three backend tasks."

So **all** replicas are used; traffic is distributed across them. None of them
"owns" the host port—the mesh does. Each replica only exposes its container
port on the service network. Multiple replicas therefore share a single
published host port, and no replica gets its own host port.

## 2. Swarm host mode: Linux vs Docker Desktop (Mac/Windows)

**Applies to:** Platform-specific differences in Swarm `mode: host` behavior

To give each replica its own host port in Swarm you must use **host** publishing:

- Set `mode: host`.
- Use a **published port range** (e.g. `published: 8000-8002`) so Swarm can assign
one port from the range per task.

### Linux (native Docker)

On **Linux** with native Docker:

- `mode: host` binds directly to the host's network namespace.
- Port ranges work perfectly: each task gets one port from the range (e.g. 8000,
  8001, 8002) on the actual host.
- You can reliably access replicas via `localhost:8000`, `localhost:8001`,
  `localhost:8002`.

**Result:** ✅ Port range split across replicas works as expected.

### Docker Desktop (Mac and Windows)

On **Mac** or **Windows** with Docker Desktop:

- Docker runs inside a Linux VM (WSL2 on Windows, or Hyper-V). In `mode: host`,
  "host" means that VM, not your Mac or Windows machine.
- Ports are bound in the VM's network namespace; exposing them predictably to the
  Mac/Windows host is limited and can behave oddly.
- Even though Swarm assigns ports correctly within the VM, accessing them from
  the host OS may require port forwarding or may not work reliably.

**Result:** ⚠️ Port range assignment works within the VM, but accessing those ports
from the Mac/Windows host is unreliable. The limitation is Docker Desktop's
VM-based architecture, not Swarm itself.

**Summary:** For "one port per replica" with Swarm, use `mode: host` + port range
on **Linux** for best results. On Docker Desktop (Mac/Windows), consider using
`mode: ingress` (one port, load-balanced) or a reverse proxy (section 3.4)
instead.

## 3. Compose (no Swarm): replicas and ports

**Applies to:** Linux, macOS, Windows (all platforms - behavior is identical)

If you run with **Compose only** (no `docker swarm init` / `docker stack deploy`),
scaling and ports behave differently. The behavior described below is the same on
all operating systems.

### 3.1 Fixed host port + scale → conflict

```yaml
services:
  backend:
    ports:
      - "8000:8000"
```

Then:

```bash
docker compose up -d --scale backend=3
```

**Result:** Only one container can bind to host port 8000. The other replicas fail
with "port is already allocated." You do **not** get multiple replicas each with
their own port.

### 3.2 Container port only → auto-assigned host ports

```yaml
services:
  backend:
    ports:
      - "8000"   # container port only; host port chosen by Docker
```

Then:

```bash
docker compose up -d --scale backend=3
```

**Result:** Each replica gets a different host port (e.g. 32768, 32769, 32770).
Ports are **not** 8000, 8001, 8002; they are chosen from the ephemeral range
(typically 32768 and above). You get one host port per replica, but they are
unpredictable until after the containers start.

To see which host port each replica has:

```bash
docker compose ps
```

You can also use `docker compose port backend 8000` to resolve the host port
for a given service and container port; with multiple replicas, the resolved
port depends on which task Compose returns. For a full mapping, use
`docker compose ps` or inspect the task names (e.g. `myapp-backend-1`, `-2`, …).

### 3.3 Explicit replica services → predictable ports

Compose has no built-in "one host port per scaled replica." To get fixed ports
(8000, 8001, 8002), define **one service per replica** and map each to the desired
host port:

- `backend-1` → `"8000:8000"`
- `backend-2` → `"8001:8000"`
- `backend-3` → `"8002:8000"`

The format is `"HOST:CONTAINER"`. Use the container port (right side) that your
app actually listens on; if it listens on 8080, use e.g. `"8000:8080"`.

An example exists in **`play/docker-compose.replicas.yaml`**: it uses a YAML anchor
(`x-play-base`, `&play-base`, `<<: *play-base`) to keep the definition DRY, and
maps `play-1` → 9000, `play-2` → 9001, `play-3` → 9002. Run it from the `play` directory
with: `docker compose -f docker-compose.replicas.yaml up -d`. To add more replicas,
duplicate one service block and set the next host port (e.g. 9003, 9004, …).
The example also sets an environment variable such as `REPLICA_ID` so you can distinguish
replicas in logs or at runtime. The same pattern applies to the main backend/frontend.

### 3.4 Reverse proxy / gateway: one entry port, load‑balanced (Compose)

Without Swarm there is no built‑in routing mesh. To get **one host port for
clients** and **traffic load‑balanced across replicas**, add a reverse proxy
(or API gateway) as its own service. Only the proxy publishes a host port; the
replicas stay internal and are reached by the proxy over the Compose network.

**Idea:**

- Replicas are separate services (e.g. `backend-1`, `backend-2`, `backend-3`)
  with **no** `ports:` so they are not exposed on the host.
- A **gateway** service (e.g. nginx, Traefik, Caddy) publishes a single host
  port (e.g. 8000) and proxies to `backend-1:8000`, `backend-2:8000`,
  `backend-3:8000` using the Compose service names. The proxy chooses an
  upstream per request (e.g. round‑robin or least connections).

#### Example: nginx as reverse proxy

- **Compose:** define replica services and a gateway on the same network; only
  the gateway publishes a port:

```yaml
services:
  backend-1:
    image: myapp-backend:latest
    # no ports: → not on host; reachable as backend-1:8000 inside the network
  backend-2:
    image: myapp-backend:latest
  backend-3:
    image: myapp-backend:latest

  gateway:
    image: nginx:alpine
    ports:
      - "8000:8000"
    volumes:
      - ./nginx/backend-lb.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend-1
      - backend-2
      - backend-3

networks:
  default:
    name: myapp-network
```

- **Nginx config:** upstream list and proxy. This project already provides
  [`nginx/backend-lb.conf`](nginx/backend-lb.conf), which looks like this:

```nginx
upstream backend {
    least_conn;
    server backend-1:8000 max_fails=3 fail_timeout=30s;
    server backend-2:8000 max_fails=3 fail_timeout=30s;
    server backend-3:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 8000;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Clients use `http://localhost:8000`; nginx forwards each request to one of
`backend-1`, `backend-2`, or `backend-3`. Replicas do not need host ports.

To add or remove replicas, add or drop a `backend-N` service and a
`server backend-N:8000 ...` line in the upstream block (or generate the config
via a template). Alternatives (Traefik, Caddy, envoy) use the same idea: one
gateway port, upstreams = replica service names on the Compose network.

## 5. Port ranges: Compose V2 vs Swarm

> [!NOTE]
>
> This project requires Docker Compose V2. Compose V1 is legacy and not supported.

### 5.1 Compose V2 (current)

In Compose V2, a port range is applied to **each** container:

- `ports: ["8080-8081:80"]` and `--scale relay=2`
- Replica 1: host 8080–8081 → container 80 (binds both 8080 and 8081)
- Replica 2: fails with "port is already allocated"

So a range **does not** mean "distribute one port from the range per replica".
It means "this container gets the whole range," which conflicts when you scale.

The same behaviour applies when you use `deploy.replicas: N` in the compose file
and run `docker compose up` (no Swarm): the port range is still applied to every
container, so the conflict occurs regardless of whether scale comes from `--scale`
or from the file.

Older or non-standard syntaxes (e.g. `"9251+:9249"` or certain range semantics
in very old Compose versions) are not reliable in current Compose; only the approaches
in section 3 (container port only, or explicit replica services) are supported.

See: [docker/compose#8878 – Compose V2 – Port Ranges and Scale Behavior Changed](https://github.com/docker/compose/issues/8878).

> [!NOTE]
>
> Compose V1 is legacy and not supported by this project.
> All references to "Compose" in this document refer to Compose V2.

### 5.3 Swarm with host mode

**Applies to:** Platform-specific (see section 2 for details)

In **Docker Swarm**, with `mode: host` and a **published port range**:

- `published: 8000-8002` with 3 replicas
- Swarm assigns **one** port from the range **per task** (e.g. 8000, 8001, 8002).

So "port range that is split across replicas" **does** work in Swarm, but only
with **host** mode. Platform differences:

- **Linux:** ✅ Works perfectly; each replica gets its port on the host.
- **Docker Desktop (Mac/Windows):** ⚠️ Works within the VM, but accessing from the
  host OS has limitations (see section 2).

## 6. Quick reference

| Goal | Swarm (ingress) | Swarm (host + range) | Compose V2 (scale) |
| ------ | ------------------ | ------------------------ | ------------------- |
| Multiple replicas, one entry port, load-balanced | ✅ Yes (all platforms) | N/A | ✅ Yes with reverse proxy (section 3.4) |
| One host port per replica (e.g. 8000, 8001, 8002) | ❌ No | ✅ Linux: Yes; ⚠️ Mac/Windows: Limited | ❌ No with port range |
| Each replica gets *some* host port | N/A (mesh shares one) | ✅ Linux: Yes; ⚠️ Mac/Windows: Limited | ✅ Yes if you publish container port only |
| Port range split across replicas | N/A | ✅ Linux: Yes; ⚠️ Mac/Windows: Limited | ❌ No in Compose V2 |

| Approach | How to get one port per replica |
| ---------- | --------------------------------- |
| **Swarm** | Use `mode: host` and `published: 8000-8002` (works perfectly on Linux; limited on Docker Desktop Mac/Windows). |
| **Compose V2** | Define separate services (e.g. backend-1, backend-2, backend-3) with fixed ports; see `play/docker-compose.replicas.yaml`. Works on all platforms. |
| **Compose V2** | Or use `ports: ["8000"]` and `--scale`; each replica gets an ephemeral host port (discover via `docker compose ps`). Works on all platforms. |
| **Compose V2** | Use a reverse proxy (section 3.4): one gateway port, upstreams = replica service names; replicas need no host ports. Works on all platforms. |

## 7. References

- **Example compose file for "one service per replica, fixed ports":**
  [`play/docker-compose.replicas.yaml`](play/docker-compose.replicas.yaml)
- **Compose V2 port range vs scale:**
  [GitHub: docker/compose#8878](https://github.com/docker/compose/issues/8878)
- **Project Swarm setup:**
  [`setup-with-swarm.sh`](setup-with-swarm.sh), [`fragments/backend.yaml`](fragments/backend.yaml),
  [`fragments/frontend.yaml`](fragments/frontend.yaml)
- **Reverse-proxy example (nginx upstream):**
  [`nginx/backend-lb.conf`](nginx/backend-lb.conf), [`nginx/frontend-lb.conf`](nginx/frontend-lb.conf)
