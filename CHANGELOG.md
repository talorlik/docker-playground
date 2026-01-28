# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-01-29

### Added

- Dual deployment mode support (Swarm and Proxy)
- Fragment template system using YAML anchors and aliases
- Conditional fragment rendering based on deployment mode (`swarm` or `proxy`)
- `scripts/render-fragments.sh` script for fragment rendering
- `setup-with-proxy.sh` script for proxy mode deployment
- `TEMPLATES.md` documentation explaining the fragment anchor system
- Support for conditional includes in `docker-compose.yaml` via `${PROXY_INCLUDE}`
placeholder
- Extension fields (`x-swarm`, `x-proxy`) for deployment-specific configurations

### Changed

- Refactored compose configuration to use fragment templates with YAML anchors
- Updated `docker-compose.yaml` to support conditional fragment includes
- Modified setup scripts to automatically render fragments before deployment

### Documentation

- Formatted and improved all documentation files
- Added comprehensive documentation for fragment template system

## [0.2.0] - 2026-01-21

### Added

- Full CRUD (Create, Read, Update, Delete) functionality
- User table with standard functionality
- User management endpoints and database schema

### Changed

- Updated documentation to reflect new CRUD capabilities
- Updated setup process to merge fragments prior to deployment (required for Docker
Stack compatibility)

### Documentation

- Created `WARP.md` with comprehensive guidance for WARP (warp.dev) integration
- Documented Docker Stack limitations with `include` directive
- Added troubleshooting and development workflow documentation

## [0.1.0] - 2026-01-21

### Added

- Initial Docker playground setup with frontend, backend, and nginx
- Docker Swarm high availability configuration
- Modular Docker Compose fragment system
- Network isolation between frontend, backend, and database layers
- PostgreSQL primary and replica database setup
- Backend service with 3 replicas
- Frontend service with 2 replicas
- Health check endpoints for all services
- Load balancing via Docker Swarm routing mesh
- Resource limits and placement constraints
- Rolling update strategy with automatic rollback
- `setup-with-swarm.sh` script for automated deployment
- `remove.sh` script for stack cleanup
- Comprehensive README with architecture diagrams and usage instructions

### Architecture

- Three-tier architecture:
  - Frontend Layer: React app (2 replicas) on port 3000
  - Backend Layer: Node.js/Express API (3 replicas) on port 8000
  - Database Layer: PostgreSQL primary/replica on port 5432
- Network isolation:
  - `frontend-backend-network`: Frontend ↔ Backend communication
  - `backend-db-network`: Backend ↔ Database communication
  - Frontend cannot directly access database

### Infrastructure

- Docker Swarm mode with service discovery
- Overlay networks for multi-host communication
- Persistent volumes for database data
- Health checks with automatic restart
- Zero-downtime rolling updates

[Unreleased]: https://github.com/talorlik/docker-playground/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/talorlik/docker-playground/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/talorlik/docker-playground/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/talorlik/docker-playground/releases/tag/v0.1.0
