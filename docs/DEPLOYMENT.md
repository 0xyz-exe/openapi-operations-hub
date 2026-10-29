# Production Deployment Guide

## Docker Compose (Recommended)

1. Clone repository:
   ```bash
   git clone https://github.com/0xyz-exe/openapi-operations-hub.git
   cd openapi-operations-hub
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Update JWT_SECRET and ADMIN_PASSWORD
   ```

3. Build and launch services:
   ```bash
   docker compose up -d --build
   ```

4. Verify health endpoint:
   ```bash
   curl http://localhost:3000/api/v1/system/health
   ```

5. Access web interface at `http://localhost:3000`.

## Bare Metal / Node.js Deployment
Prerequisites: Node.js 22.0.0+ and pnpm 12.0.0+.

```bash
pnpm install --frozen-lockfile --allow-build esbuild
pnpm build
pnpm seed # Optional demo data
PORT=3000 pnpm start
```
