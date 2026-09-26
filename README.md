# rewards

A small, API-first loyalty/rewards service. It manages reward configurations
(percentage or fixed), loyalty members (persons), and a points ledger: points
are added to, removed from, and redeemed against a person's balance. Designed
as a learning/quality reference for how an API-first TypeScript project with
strict SOLID adherence is structured.

## Features

- **API-first contract** — request/response shapes are declared once as Zod
  schemas and drive validation, serialization, and the auto-generated OpenAPI
  spec.
- **Layered architecture** — `presentation -> application -> domain`, with
  dependencies always pointing inward.
- **SOLID by construction** — single-purpose use cases, strategy-based reward
  types, port/interface segregation, and a hand-rolled composition root (no DI
  framework).
- **Pluggable persistence** — a `Database` port with a SQLite adapter
  (`better-sqlite3`); MariaDB/PostgreSQL adapters can be added without touching
  any other layer.
- **Self-documenting** — interactive Swagger UI at `GET /docs`.
- **Static frontend** — a Vanilla TS + Tailwind (Material 3) homepage served at
  `/` showing receiver members and their points balances.

## Tech stack

| Concern       | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Runtime       | Node.js >= 20 (ESM, `"type": "module"`)                       |
| Language      | TypeScript 5 (strict)                                         |
| HTTP server   | Fastify 5                                                     |
| API contract  | Zod schemas + `fastify-type-provider-zod` -> OpenAPI/Swagger  |
| Persistence   | SQLite via `better-sqlite3`, behind a `Database` port         |
| Dependency In | hand-rolled composition root (no DI framework)                |
| Testing       | Vitest 3 + `@vitest/coverage-v8` (80% threshold)              |
| Dev runner    | `tsx`                                                         |
| Frontend      | Vanilla TS + Tailwind CSS 4 (Material 3 theme), served statically by Fastify |

## Quick start

```console
npm install
npm run dev
```

The server starts on `http://localhost:3000` (override with `PORT`/`HOST` env
vars). Verify it is up:

```console
curl http://localhost:3000/api/v1/healthCheck
# {"status":"OK","appVersion":"1.0.0","timestamp":1775068100000}
```

## Running in a container (podman / docker compose)

Build and run with podman directly:

```console
podman build -t puroshkar:latest .
podman run -p 3000:3000 -v puroshkar-data:/data puroshkar:latest
```

Or use the optional compose file with either `docker compose` (or
`podman-compose` / `podman compose`):

```console
podman-compose up -d --build   # or: docker compose up -d --build
```

The container listens on `http://localhost:3000`, persists the SQLite database
to a named `rewards-data` volume, and exposes the same API (`/api/v1/...`) and
`/docs` Swagger UI as a local run.

Compose brings up a second service, `swagger-ui`, which renders the committed
[`docs/openapi.json`](./docs/openapi.json) at
<http://localhost:13003>. Refresh the spec first with
`npm run openapi:generate` after changing a route or a Zod schema — the
container mounts the file read-only. The API allows that UI origin through
`CORS_ORIGIN` (comma-separated allowlist, `*` to reflect any origin), so "Try
it out" works against the API on <http://localhost:13002>.

## API overview

| Method | Path                   | Description                          |
| ------ | ---------------------- | ------------------------------------ |
| GET    | `/api/v1/healthCheck`  | Liveness + app version               |
| GET    | `/api/v1/rewards`      | List rewards (`?active=true` filter) |
| GET    | `/api/v1/rewards/:id`  | Get one reward                       |
| POST   | `/api/v1/rewards`      | Create a reward                      |
| DELETE | `/api/v1/rewards/:id`  | Delete a reward                      |
| POST   | `/api/v1/rewards/calculate` | Points earned for an amount      |
| GET    | `/api/v1/persons`      | List persons                         |
| GET    | `/api/v1/persons/:id`  | Get one person (+ points balance)    |
| POST   | `/api/v1/persons`      | Create a person (role `provider` or `receiver`) |
| PUT    | `/api/v1/persons/:id`  | Update a person (role mutable)                  |
| DELETE | `/api/v1/persons/:id`  | Delete a person                                 |
| POST   | `/api/v1/points/add`   | Grant points (requires `providerId`; active provider only, never to self) |
| POST   | `/api/v1/points/remove`| Remove points from a person                     |
| POST   | `/api/v1/points/redeem`| Redeem a person's points             |
| GET    | `/docs`                | Swagger UI                           |
| GET    | `/docs/json`           | Generated OpenAPI spec               |

A second, container-only Swagger UI renders the committed spec at
<http://localhost:13003> (see the container section above).

## Documentation

Detailed docs live in the [`docs/`](./docs/) directory:

- [Getting started](./docs/getting-started.md) — prerequisites, setup, running, building.
- [Architecture](./docs/architecture.md) — layered design, SOLID, request flow, DI.
- [API reference](./docs/api.md) — endpoints, schemas, errors, examples.
- [OpenAPI spec](./docs/openapi.json) — generated from the Zod schemas (`npm run openapi:generate`).
- [Development & testing](./docs/development.md) — commands, conventions, testing patterns.

## Commands

| Task                  | Command                                  |
| --------------------- | ---------------------------------------- |
| Install deps          | `npm install`                            |
| Run dev server (watch)| `npm run dev`                            |
| Typecheck (src)       | `npm run typecheck`                      |
| Typecheck (src+tests) | `npm run typecheck:test`                 |
| Typecheck (frontend)  | `npm run typecheck:web`                  |
| Full check            | `npm run check` (typecheck + tests)      |
| Run tests             | `npm test` or `npm run test:coverage`    |
| Build (emit dist)     | `npm run build`                          |
| Start built server    | `npm start`                              |
| Regenerate OpenAPI spec | `npm run openapi:generate` (-> `docs/openapi.json`) |

