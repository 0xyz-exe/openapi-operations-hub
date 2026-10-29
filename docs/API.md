# REST API Reference (`/api/v1`)

All endpoints respond with JSON and standard HTTP status codes.

### Authentication
- `POST /api/v1/auth/login`: Authenticate and issue HTTP-only session cookie.
- `GET /api/v1/auth/me`: Get current authenticated user profile.
- `POST /api/v1/auth/logout`: Revoke active session.

### API Catalog
- `GET /api/v1/apis`: Query API catalog with `q`, `lifecycle`, `health`, and `type` filters.
- `POST /api/v1/apis`: Register new API service.
- `GET /api/v1/apis/:id`: Retrieve API details, environments, specs, checks, and incidents.
- `PATCH /api/v1/apis/:id`: Update API metadata.
- `DELETE /api/v1/apis/:id`: Delete API service (Admin only).

### Specifications & Governance
- `GET /api/v1/apis/:id/specifications`: List versions of specifications.
- `POST /api/v1/apis/:id/specifications`: Upload raw specification string.
- `POST /api/v1/specifications/import`: Import specification via URL (SSRF guarded) or raw text.
- `POST /api/v1/specifications/compare`: Calculate diff and breaking changes between two specs.
- `POST /api/v1/specifications/governance`: Evaluate specification against quality rules.

### Monitoring & Incidents
- `GET /api/v1/monitoring/checks`: List active monitoring probes.
- `POST /api/v1/monitoring/checks`: Configure new synthetic health probe.
- `POST /api/v1/monitoring/checks/:id/run`: Trigger immediate manual probe run.
- `GET /api/v1/monitoring/summary`: Get uptime %, average latency, and health counts.
- `GET /api/v1/monitoring/runs`: Query telemetry history.
- `GET /api/v1/incidents`: Query incident list with status filter.
- `POST /api/v1/incidents/:id/acknowledge`: Acknowledge open incident.
- `POST /api/v1/incidents/:id/resolve`: Resolve incident with resolution note.

### System & Export
- `GET /api/v1/system/health`: Liveness and database connectivity probe.
- `GET /api/v1/export/apis`: Export API catalog as CSV or JSON.
- `GET /api/v1/export/monitoring`: Export telemetry runs as CSV.
- `GET /api/v1/export/audit-logs`: Export audit trail as CSV.
