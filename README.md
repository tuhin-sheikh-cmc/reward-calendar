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
| POST   | `/api/v1/persons`      | Create a person                      |
| PUT    | `/api/v1/persons/:id`  | Update a person                      |
| DELETE | `/api/v1/persons/:id`  | Delete a person                      |
| POST   | `/api/v1/points/add`   | Add points to a person               |
| POST   | `/api/v1/points/remove`| Remove points from a person          |
| POST   | `/api/v1/points/redeem`| Redeem a person's points             |
| GET    | `/docs`                | Swagger UI                           |

## Documentation

Detailed docs live in the [`docs/`](./docs/) directory:

- [Getting started](./docs/getting-started.md) — prerequisites, setup, running, building.
- [Architecture](./docs/architecture.md) — layered design, SOLID, request flow, DI.
- [API reference](./docs/api.md) — endpoints, schemas, errors, examples.
- [Development & testing](./docs/development.md) — commands, conventions, testing patterns.

## Commands

| Task                  | Command                                  |
| --------------------- | ---------------------------------------- |
| Install deps          | `npm install`                            |
| Run dev server (watch)| `npm run dev`                            |
| Typecheck (src)       | `npm run typecheck`                      |
| Typecheck (src+tests) | `npm run typecheck:test`                 |
| Full check            | `npm run check` (typecheck + tests)      |
| Run tests             | `npm test` or `npm run test:coverage`    |
| Build (emit dist)     | `npm run build`                          |
| Start built server    | `npm start`                              |

