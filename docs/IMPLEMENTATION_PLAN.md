# OpenAPI Operations Hub — Implementation Plan

## 1. Executive Summary & Vision
OpenAPI Operations Hub is a production-grade, self-hosted platform enabling engineering teams, platform engineers, and API developers to discover, document, monitor, and manage APIs across multiple environments with zero proprietary vendor lock-in.

## 2. Architecture & Tech Stack
- **Unified Full-Stack Framework**: Next.js 16 with App Router, TypeScript (strict mode), Server Actions & Route Handlers.
- **Frontend Layer**: React 19, Tailwind CSS v4, Lucide Icons, Recharts for latency and availability visualization, accessible components.
- **Storage & Data Layer**: Native Node.js `node:sqlite` (`DatabaseSync`) with Write-Ahead Logging (WAL) mode, foreign key enforcement, and automated migrations. Zero binary compilation overhead on Windows/Linux.
- **Specification Engine**: High-performance JSON/YAML OpenAPI 3.0.x / 3.1.x parser, validator, governance linter, and semantic diff engine.
- **Health & Operations Worker**: Background health checking engine with configurable intervals, timeout handling, retry policies, and automated incident state transitions.
- **Security & SSRF Guard**: Centralized outbound request validation blocking private IP ranges (RFC 1918), loopback, link-local, cloud metadata (169.254.169.254), and DNS rebinding risks.

## 3. Database Schema
1. **users**: id, email, password_hash, role (admin, maintainer, viewer), name, created_at, updated_at.
2. **api_services**: id, slug, name, description, api_type (REST, GraphQL, gRPC), base_url, owner, team, tags, lifecycle (draft, active, deprecated, archived), visibility (public, private), repo_url, doc_url, contact_email, health_status, created_at, updated_at.
3. **api_environments**: id, api_id, name (production, staging, development), base_url, is_default, created_at.
4. **api_specifications**: id, api_id, title, version, openapi_version, raw_spec, spec_format (json, yaml), spec_hash, validation_status, validation_errors, created_at, updated_at.
5. **api_specification_versions**: id, spec_id, version, spec_hash, raw_spec, changelog, created_at.
6. **monitoring_checks**: id, api_id, environment_id, name, endpoint_url, method, expected_status, interval_seconds, timeout_ms, is_enabled, last_run_at, current_status, created_at, updated_at.
7. **monitoring_check_runs**: id, check_id, status_code, latency_ms, status (healthy, degraded, unhealthy), error_message, checked_at.
8. **monitoring_incidents**: id, api_id, check_id, title, severity (critical, major, minor), status (open, acknowledged, resolved), started_at, acknowledged_at, resolved_at, notes.
9. **incident_events**: id, incident_id, event_type, message, created_at.
10. **quality_findings**: id, spec_id, rule_id, severity (error, warning, info), message, path, remediation, created_at.
11. **audit_logs**: id, user_id, user_email, action, resource_type, resource_id, metadata, created_at.
12. **notification_channels**: id, name, type (in_app, webhook, email), config, is_enabled, created_at.
13. **notification_logs**: id, channel_id, event_type, payload, status, created_at.

## 4. API Contracts (`/api/v1`)
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
- `GET /api/v1/apis`, `POST /api/v1/apis`, `GET /api/v1/apis/[id]`, `PATCH /api/v1/apis/[id]`, `DELETE /api/v1/apis/[id]`
- `GET /api/v1/apis/[id]/specifications`, `POST /api/v1/apis/[id]/specifications`
- `POST /api/v1/specifications/import` (File/JSON/YAML/URL with SSRF protection)
- `POST /api/v1/specifications/compare` (Semantic version diffing & breaking change detection)
- `POST /api/v1/specifications/governance` (Linting against quality rules)
- `GET /api/v1/monitoring/checks`, `POST /api/v1/monitoring/checks`, `POST /api/v1/monitoring/checks/[id]/run`
- `GET /api/v1/monitoring/summary`, `GET /api/v1/monitoring/runs`
- `GET /api/v1/incidents`, `POST /api/v1/incidents/[id]/acknowledge`, `POST /api/v1/incidents/[id]/resolve`
- `GET /api/v1/audit-logs`, `GET /api/v1/system/health`, `GET /api/v1/system/stats`
- `POST /api/v1/proxy/test` (Safe Try-It-Out testing gateway)
- `GET /api/v1/export/apis`, `GET /api/v1/export/monitoring`, `GET /api/v1/export/audit-logs`

## 5. Security Architecture
- Centralized SSRF filter blocking loopback, IPv4 private ranges, link-local, cloud metadata, and IPv6 loopbacks.
- Strict JWT session cookies (HttpOnly, SameSite=Lax).
- Role-based authorization for administrative vs viewer actions.
- Input validation via Zod schemas across all mutation endpoints.
- Append-only audit logging for compliance and governance.

## 6. Testing & Quality Strategy
- **Unit & Integration Tests**: Comprehensive Vitest test suite testing database operations, specification parser, SSRF validator, governance engine, and diff comparator.
- **End-to-End Workflow & Visual Evidence**: Playwright test suite exercising catalog management, spec import, documentation explorer, health probe execution, incident resolution, and high-resolution screenshot generation.
- **Container Validation**: Production multi-stage Dockerfile and docker-compose.yml testing.

## 7. Delivery Milestones
- [x] Phase 0: Discovery, Architecture, and Implementation Plan.
- [ ] Phase 1: Storage Layer, Migrations, Seed Data, and Core Security Utils.
- [ ] Phase 2: Authentication, API Catalog & Environment CRUD.
- [ ] Phase 3: OpenAPI Specification Registry, Parser, Diffing & Interactive Documentation.
- [ ] Phase 4: Monitoring Engine, Background Probes, and Latency Analytics.
- [ ] Phase 5: Incident Management & In-App Notification Center.
- [ ] Phase 6: API Governance, Quality Scoring, Audit Logs, and Data Export.
- [ ] Phase 7: Automated Tests, Visual Verification, GitHub Publication, and Documentation.
