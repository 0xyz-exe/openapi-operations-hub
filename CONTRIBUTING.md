# Contributing to OpenAPI Operations Hub

We welcome issues and pull requests from the developer community.

## Development Workflow
1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   pnpm install --allow-build esbuild
   ```
3. Run tests:
   ```bash
   pnpm test
   ```
4. Start local development server:
   ```bash
   pnpm dev
   ```
5. Ensure production build passes before submitting PR:
   ```bash
   pnpm build
   ```

## Commit Message Guidelines
Use clear conventional commit messages: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
