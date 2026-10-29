# Changelog

All notable changes to OpenAPI Operations Hub will be documented in this file.

## [1.0.0] - 2026-10-30

### Initial Release
- **API Catalog & Inventory**: Centralized registry for internal and external APIs with search, lifecycle status, environments, and ownership metadata.
- **OpenAPI Specification Registry**: Support for OpenAPI 3.0.x and 3.1.x in JSON and YAML formats with version hashing and changelog tracking.
- **Interactive Documentation Portal**: Live Swagger-style documentation viewer with parameters breakdown, schema definitions, and embedded "Try It Out" execution console.
- **Version Diffing & Breaking Change Detection**: Automated semantic diffing classifying breaking vs non-breaking changes across specification versions.
- **Active Health Monitoring**: Configurable synthetic probes with latency tracking, uptime calculation, and time-series visualization.
- **Incident Management**: Automated outage detection, consecutive failure triggers, acknowledgement, and resolution event timeline.
- **API Quality & Governance**: Deterministic linter rules evaluating description completeness, response coverage, and HTTPS enforcement with 0-100 quality scoring.
- **Security & SSRF Guard**: Centralized request filter preventing loopback, private RFC1918 networks, and cloud metadata access.
- **Audit Logging & Exports**: Append-only audit records and CSV data export with formula injection prevention.
- **Containerization**: Production multi-stage Dockerfile and Docker Compose service configurations.
