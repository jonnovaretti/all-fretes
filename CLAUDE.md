# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev          # Run in watch/dev mode
npm run build              # Compile TypeScript to dist/
npm run start              # Run compiled output (production)
npm run lint               # ESLint with auto-fix
npm run migration:generate # Generate migration from entity changes
npm run migration:run      # Apply pending migrations
```

There are no tests in this codebase.

## Architecture

NestJS application that syncs shipping data from the GoFrete portal into PostgreSQL using Playwright for browser automation and BullMQ for background job processing.

### Module structure

- **accounts** — CRUD for accounts (carrier portal credentials). Passwords stored encrypted at-rest using AES-256-GCM via a TypeORM column transformer in `passwordTransformer`.

- **users / auth** — User registration and JWT authentication (access + refresh tokens). Guards: `JwtAuthGuard`. Strategies: `JwtStrategy`.

- **shipments** — `Shipment` entity (keyed by `(accountId, externalId)`) and `Tracking` entity. `ShipmentsService` exposes upsert, tracking update, and consolidated-status helpers.

- **sync** — Three independent BullMQ queue+worker pairs, each in their own service (workers are instantiated directly in the service constructor, not via `@nestjs/bull`):
  - `ShipmentSyncService` — logs into GoFrete via Playwright, extracts session cookies, then calls the `/Quotation/Quotations` HTTP API for `collected` and `finished` statuses, upserts results.

  - `TrackingSyncService` — iterates all shipments for an account, navigates to `/Rastreamento?query=<externalId>` via Playwright and scrapes the tracking timeline, updates carrier/estimate/events.

  - `ConsolidatedStatusSyncService` — pure DB computation (no browser); applies business rules to derive `consolidatedStatus` (delayed / finished / returning / in transit) from `shipment.status` and tracking text.

- **playwright** — `GoFreteNavigatorService` wraps Playwright: login at `/Entrar`, navigate `/Pedidos` and `/Rastreamento`, extract table rows and tracking events.

- **health** — `GET /health` liveness endpoint.

### Sync queues

Three BullMQ queues, names from `src/common/constants.ts`:

- `SYNC_SHIPMENTS_QUEUE_NAME` — triggered by `POST /accounts/:id/sync/shipment`
- `SYNC_TRACKING_QUEUE_NAME` — triggered by `POST /accounts/:id/sync/tracking`
- `SYNC_CONSOLIDATED_STATUS_QUEUE_NAME` — triggered by `POST /accounts/:id/sync/consolidated-status`

Each queue is provided as an injection token (`SYNC_QUEUE`, `SYNC_TRACKING_QUEUE`, `SYNC_CONSOLIDATED_STATUS_QUEUE`) from `SyncModule`.

### Database

TypeORM with PostgreSQL. Migration files live in `src/migrations/`. Migrations **also run automatically on app bootstrap** via `AppModule.onApplicationBootstrap` calling `dataSource.runMigrations()`.

Config prefers `DATABASE_URL` (connection string) over individual `DB_*` vars, and `REDIS_URL` over individual `REDIS_*` vars.

### Account password encryption

`ACCOUNT_PASSWORD_ENCRYPTION_KEY` (32-byte base64) is required. The TypeORM transformer in `src/common/crypto/password-encryption.ts` encrypts on write and decrypts on read transparently.

### Environment variables

| Variable                          | Purpose                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | PostgreSQL connection string (preferred over `DB_*` vars)                           |
| `REDIS_URL`                       | Redis connection string (preferred over `REDIS_*` vars)                             |
| `ACCOUNT_PASSWORD_ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM account password encryption                      |
| `PLAYWRIGHT_HEADLESS`             | Set to `false` to show browser during local development/debugging (default: `true`) |
| `PORT`                            | HTTP port (default: `3000`)                                                         |

### Swagger UI

Available at `GET /docs` when the app is running.
