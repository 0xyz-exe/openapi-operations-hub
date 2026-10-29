# OpenAPI Operations Hub Architecture

## Overview
OpenAPI Operations Hub is designed as a unified modular platform providing API discovery, interactive documentation, synthetic monitoring, and contract governance.

```
┌─────────────────────────────────────────────────────────────┐
│                    Web & Desktop Browser                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                    Next.js App Router (v16)                 │
│  - React 19 Frontend + Tailwind CSS v4                      │
│  - Route Handlers (/api/v1/...)                             │
│  - JWT Session Auth + RBAC                                  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     Specification Engine    ││      Monitoring Engine       │
│  - JSON / YAML Parser       ││  - Synthetic Probes          │
│  - Semantic Version Diff    ││  - Latency Telemetry         │
│  - Governance Rule Evaluator││  - Auto-Incident Trigger     │
└──────────────┬──────────────┘└──────────────┬───────────────┘
               │                              │
               │   ┌──────────────────────┐   │
               └───►  Central SSRF Guard  ◄───┘
                   │  (Private IPs / AWS) │
                   └──────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│           Persistent Storage: node:sqlite (WAL)             │
│  - Foreign Key Constraints Enabled                          │
│  - Zero C++ Compilation Dependency                         │
│  - Native DatabaseSync in Node.js 22+                       │
└─────────────────────────────────────────────────────────────┘
```

## Key Components
1. **Unified Next.js Service**: Eliminates the operational complexity of managing separate frontend and backend daemon processes by leveraging Next.js App Router with Route Handlers for high-speed API endpoints and Server/Client Components for the UI.
2. **Native Embedded SQLite**: Utilizes `node:sqlite` (`DatabaseSync`) with Write-Ahead Logging (WAL) mode for low-latency persistence without external database servers.
3. **Centralized SSRF Filter**: Central guard protecting outbound probe and import requests against link-local, loopback, private RFC 1918 subnets, and cloud metadata (169.254.169.254).
