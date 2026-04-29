# Project Guidelines

## Architecture

- `src/` contains the Vite + Svelte frontend and service worker.
- `server/` contains the Node.js Web Push service, scheduler, HTTP API, and SQLite integration.
- `shared/` contains types and pure rain-check logic shared by frontend and server.
- `docs/` contains deployment and design details. Prefer linking there instead of duplicating long explanations.

## Commands

```bash
pnpm install
pnpm dev:app
pnpm dev:server
pnpm build
pnpm build:app
pnpm build:server
pnpm preview
pnpm server:start
pnpm server:check
pnpm run typecheck:server
```

## Validation

- For changes under `server/`, run `pnpm run typecheck:server` first.
- For frontend-only changes, run `pnpm build:app` when a focused check is needed.
- For changes that cross frontend/server/shared boundaries, run `pnpm build`.
- There is no dedicated automated test suite yet. Use `pnpm server:check` only when validating rain-alert flow against a configured local environment.

## Conventions

- Do not introduce SvelteKit. This project is a Vite + Svelte SPA.
- Frontend weather requests should go through `/api/caiyun/*`; do not expose the Caiyun token in client code.
- Rain alerts are implemented as server-side Web Push, not Periodic Background Sync.
- Keep shared rain decision logic in `shared/rain-check.ts` when both frontend and server need the same behavior.
- Avoid broad refactors in docs-only or feature-local tasks.

## Docs

- See `README.md` for project overview and operator-facing setup.
- See `docs/rain-alert-push-setup.md` for Web Push and environment-variable setup.
- See `docs/superpowers/specs/2026-04-06-rain-alert-design.md` for the rain-alert design background.
