# all-fretes sync service

Production-ready NestJS demo service that enqueues sync jobs, uses Playwright (Chromium) to scrape a local mock portal, and persists shipments into PostgreSQL.

## Stack
- Node.js 20
- NestJS + TypeScript
- BullMQ + Redis
- Playwright (bundled Chromium)
- PostgreSQL + TypeORM + migrations
- Docker + docker-compose

## Project structure
```txt
src/
  app.module.ts
  main.ts
  common/
    constants.ts
  config/
    app.config.ts
    database.config.ts
    data-source.ts
    queue.config.ts
  accounts/
    account.entity.ts
    accounts.controller.ts
    accounts.module.ts
    accounts.service.ts
    dto/create-account.dto.ts
  shipments/
    shipment.entity.ts
    shipments.controller.ts
    shipments.module.ts
    shipments.service.ts
  sync/
    sync.controller.ts
    sync.module.ts
    sync.service.ts
  playwright/
    playwright.module.ts
    playwright.service.ts
  mock/
    mock.controller.ts
    mock.module.ts
  health/
    health.controller.ts
    health.module.ts
  migrations/
    1723890000000-InitSchema.ts
```

## Environment variables
- `PORT`
- `DATABASE_URL` (preferred) or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `REDIS_URL` (preferred) or `REDIS_HOST`, `REDIS_PORT`
- `PLAYWRIGHT_HEADLESS`

Copy `.env.example` to `.env` as needed.

## Install and run locally (without Docker)
```bash
npm install
npm run migration:run
npm run start:dev
```

## Run full stack with Docker
```bash
docker-compose up --build
```

## API
### Create account
`POST /accounts`
```json
{
  "name": "Demo Account",
  "username": "demo",
  "password": "demo",
  "loginUrl": "http://localhost:3000/mock/login"
}
```
`loginUrl` is optional and defaults to `http://localhost:3000/mock/login`.

### Get shipments for account
`GET /accounts/:id/shipments`

### Enqueue sync
`POST /accounts/:id/sync`

### Health
`GET /health`

## Sync flow
1. API receives sync request and enqueues `sync-shipments` job.
2. Worker loads account credentials from DB.
3. Playwright visits login page and signs in using WebForms-style selectors (`name$=`, `id$=`), waits for `networkidle`, handles postback-like behavior.
4. Worker navigates to `/mock/shipments` and parses the table `#ctl00_MainContent_ShipmentsGrid`.
5. Parsed rows are upserted into `shipments` by unique `(accountId, externalId)`.

## Mock portal
- `GET /mock/login`: HTML login form with ASP.NET-like input names.
- `POST /mock/login`: sets cookie `mock_session=1`, redirects to `/mock/shipments`.
- `GET /mock/shipments`: requires session cookie and renders shipments table.

## Railway deployment notes
- Use this repository `Dockerfile` for deployment.
- Add Postgres and Redis plugins/services.
- Set required env vars: `PORT`, database vars (`DATABASE_URL` preferred), redis vars (`REDIS_URL` preferred), `PLAYWRIGHT_HEADLESS=true`.
- Ensure startup command runs migrations before app start (already in Dockerfile command):
  - `npm run migration:run && npm run start`
- Set service PORT to match Railway-provided `PORT` env var.

## Scripts
- `npm run build`
- `npm run start`
- `npm run start:dev`
- `npm run lint`
- `npm run migration:generate`
- `npm run migration:run`

## Notes
- Passwords are intentionally stored in plain text for this demo only.
