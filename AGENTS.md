# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## Project overview

`rewards` is a small, API-first loyalty/rewards service. It manages reward
configurations (percentage or fixed), loyalty members (persons), and a points
ledger: points are added to, removed from, and redeemed against a person's
balance. It is built as a learning/quality reference for how an API-first
TypeScript project with strict SOLID adherence is structured.

## Tech stack

| Concern       | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Runtime       | Node.js >= 20 (ESM, `"type": "module"`)                       |
| Language      | TypeScript 5 (strict, `tsconfig.json`)                        |
| HTTP server   | Fastify 5                                                     |
| API contract  | Zod schemas + `fastify-type-provider-zod` -> OpenAPI/Swagger  |
| Persistence   | SQLite via `better-sqlite3`, behind a `Database` port (MariaDB/PostgreSQL adapters can be added later) |
| Dependency In | hand-rolled composition root (no DI framework)                |
| Testing       | Vitest 3 + `@vitest/coverage-v8`                              |
| Dev runner    | `tsx`                                                         |
| Frontend      | Vanilla TS + Tailwind CSS 4 (Material 3 theme), served statically by Fastify |

## Commands

| Task                  | Command                                  |
| --------------------- | ---------------------------------------- |
| Install deps          | `npm install`                            |
| Run dev server (watch)| `npm run dev` (API + web assets watch)   |
| Typecheck (src)       | `npm run typecheck`                      |
| Typecheck (src+tests) | `npm run typecheck:test`                 |
| Typecheck (frontend)  | `npm run typecheck:web`                  |
| Full check            | `npm run check` (typecheck + typecheck:test + typecheck:web + tests) |
| Build (emit dist)     | `npm run build` (API + web assets)       |
| Start built server    | `npm start`                              |
| Run tests             | `npm test` or `npm run test:coverage`    |

Coverage threshold is 80% (statements/branches/functions/lines) enforced by
`vitest.config.ts`; `npm run test:coverage` fails the run if it drops below.

## API-first approach

The public API contract is the single source of truth:

1. Request/response shapes are declared once as **Zod schemas** in
   `src/presentation/schemas/*.ts`.
2. Fastify uses those schemas for **request validation, response serialization,
   and auto-generating the OpenAPI spec** (exposed at `GET /docs`).
3. Transport types are inferred from the schemas with
   `z.infer<typeof schema>` (`*.schemas.ts` exports both).
4. Every non-empty JSON response carries `appVersion` (read once from
   `package.json` in `src/version.ts`) and `timestamp` (epoch ms). They are
   declared once as `appMetaSchema` and attached with `withAppMeta(...)` in the
   presentation layer; the `204` delete endpoints return no body and so carry
   no meta. Use `z.null().describe(...)` for no-content response schemas — a
   raw `{ type: 'null' }` object breaks the OpenAPI transform.

Endpoints:

| Method | Path               | Description                          |
| ------ | ------------------ | ------------------------------------ |
| GET    | `/api/v1/healthCheck` | Liveness + app version             |
| GET    | `/api/v1/rewards`  | List rewards (`?active=true` filter) |
| GET    | `/api/v1/rewards/:id` | Get one reward                    |
| POST   | `/api/v1/rewards`  | Create a reward                      |
| DELETE | `/api/v1/rewards/:id` | Delete a reward                   |
| POST   | `/api/v1/rewards/calculate` | Points earned for an amount |
| GET    | `/api/v1/persons`  | List persons                         |
| GET    | `/api/v1/persons/:id` | Get one person (+ points balance)|
| POST   | `/api/v1/persons`  | Create a person (role `provider` or `receiver`) |
| PUT    | `/api/v1/persons/:id` | Update a person (role mutable)    |
| DELETE | `/api/v1/persons/:id` | Delete a person                   |
| POST   | `/api/v1/points/add` | Grant points (requires `providerId`; active provider only, never to self) |
| POST   | `/api/v1/points/remove` | Remove points from a person      |
| POST   | `/api/v1/points/redeem` | Redeem a person's points         |
| GET    | `/docs`            | Swagger UI                           |

## Architecture & SOLID

Layered architecture; dependencies always point **inward** (presentation ->
application -> domain) and never outward.

```
src/
├── domain/          # Pure business logic. NO framework imports, NO I/O.
│   ├── entities/    #   Reward, Person, PointsEntry aggregates
│   ├── errors/      #   DomainError hierarchy -> HTTP status codes
│   ├── repositories/#   Repository & service INTERFACES (ports)
│   └── services/    #   Strategy pattern (percentage/fixed points) + GrantPointsPolicy
├── application/     # Use cases + composition root. Orchestrates domain.
│   ├── dtos/        #   Input/output data
│   ├── use-cases/   #   One class, one business operation
│   └── di/          #   container.ts = composition root (manual wiring)
├── infrastructure/  # Adapters implementing domain ports (driven side)
│   ├── database/    #   Database port + SqliteDatabase + migrations
│   ├── id/          #   UuidIdGenerator
│   └── repositories/#   Sqlite*Repository adapters
└── presentation/    # HTTP layer (driving side)
    ├── mappers/     #   domain <-> network DTO conversion
    ├── plugins/     #   swagger, error-handler, static (serves built public/)
    ├── routes/      #   Fastify route definitions
    └── schemas/     #   Zod API contract (see above)
```

Static frontend sources live outside `src/` and are compiled into `public/`:

```
frontend/
├── pages/          # page templates (`{{TOKEN}}` slots for partials)
├── partials/       # header, navigation, footer (stitched by build-html)
├── styles/         # Tailwind v4 entry + Material 3 theme tokens
└── ts/             # vanilla TS: main.ts + lib/* (DOM code, browser target)
scripts/
└── build-html.mjs  # stitches partials into public/, supports --watch
```

`npm run build:web` (or the `npm run dev` watchers) produce `public/index.html`,
`public/assets/tailwind.css`, and `public/assets/main.js`, which
`presentation/plugins/static.ts` serves via `@fastify/static`. `public/` is
git-ignored.

How each SOLID principle is exercised:

- **S**ingle responsibility — one use case per file/class; entities hold their
  own invariants; mappers only map.
- **O**pen/closed — new reward types are added by registering a new
  `PointsCalculationStrategy` in the container, no existing class changes.
- **L**iskov — port implementations (`Sqlite*Repository`, fakes) honor
  interface contracts exactly.
- **I**nterface segregation — small focused ports: `RewardRepository`,
  `PersonRepository`, `PointsRepository`, `IdGenerator`,
  `PointsCalculationStrategy`.
- **D**ependency inversion — domain defines the interfaces; infrastructure
  implements them; use cases receive dependencies via constructor injection;
  `src/application/di/container.ts` wires everything at the composition root.

## Conventions (important for agents)

- **ESM only.** Relative imports MUST use the `.js` extension even when the
  file is `.ts` (required by `moduleResolution: NodeNext`).
  e.g. `import { Reward } from '../../domain/entities/reward.js'`.
- `tsconfig.json` builds `src/` only. `tsconfig.test.json` (noEmit) typechecks
  `src/` + `tests/` + config files. Update both when adding source files.
- Tests live in `tests/` mirroring `src/` structure (`tests/unit/domain/...`,
  `tests/unit/application/...`, etc.). Relative depth from a test file to
  `src/` depends on the folder depth — count carefully.
- Business rules go in the domain layer, not in routes or use cases.
- HTTP status mapping happens only in `presentation/plugins/error-handler.ts`
  (domain errors carry a `statusCode`, the transport layer owns the rest).
- Fakes for unit tests implement the same domain interfaces as the real
  adapters (`tests/helpers/fake-reward-repository.ts`,
  `tests/helpers/fake-person-repository.ts`).
- Route/HTTP behaviors are tested through `app.inject(...)` against
  `buildApp()` (see `tests/unit/presentation/rewards.routes.test.ts`).
- All routes are mounted under the shared `API_PREFIX` constant (`/api/v1`) in
  `src/server.ts`, so a future `/api/v2` can be mounted alongside.
- The container's repositories are **shared state** backed by a single SQLite
  connection (default `:memory:`) — tests should clear
  `container.rewardRepository`, `container.personRepository` and
  `container.pointsRepository` in `beforeEach`.
- Pass a file path to `DATABASE_URL` (e.g. `DATABASE_URL=./data/rewards.db`) to
  persist data across restarts; omit it for an ephemeral in-memory database.
- Frontend TS (`frontend/ts/**`) is a separate type space: `tsconfig.web.json`
  (noEmit, `moduleResolution: Bundler`, DOM libs) typechecks it via
  `npm run typecheck:web`. It is bundled with esbuild and follows the same
  `.js`-extension import rule. The browser code is untrusted-input-aware: build
  DOM via `textContent`/`createElement`, never `innerHTML` with user data.
- `public/` is generated — never edit it. Change `frontend/` sources and rebuild.
- The homepage fetches `GET /api/v1/persons` and filters `role === 'receiver'`
  client-side; if the API shape changes, update `frontend/ts/lib/types.ts` and
  `frontend/ts/lib/api.ts` together.

## Testing patterns

- Pure unit tests: entity invariants, strategy math, each use case with a fake
  repository / stub id generator.
- Integration-style: `POST/GET/DELETE` + validation failures + 404s via
  `app.inject`.
- Repository adapters are tested against a fresh `SqliteDatabase(':memory:')`
  (`tests/unit/infrastructure/sqlite-repositories.test.ts`).
- Static serving is covered by `tests/unit/presentation/frontend.routes.test.ts`,
  which rebuilds the web assets in `beforeAll`.
- Ratecheck: `npm run check` before pushing. Keep coverage >= 80%.

## Gotchas

- `exactOptionalPropertyTypes` is on — do not assign `undefined` explicitly to
  optional fields (the swagger config must omit keys rather than set them to
  `undefined`). Where a Zod schema makes a field optional, build the object
  conditionally instead of spreading a `string | undefined` value, e.g.
  `{ ...(input.email !== undefined ? { email: input.email } : {}) }`.
- `better-sqlite3` is a native module allowed via the `allowScripts` list in
  `package.json` — keep that entry when upgrading the dependency. `esbuild` and
  `@parcel/watcher` (needed by the Tailwind watch mode) have install scripts
  too and are on the same list.
- `npm run build` emits `dist/`, whose rootDir is `src/`; the SQLite binding is
  resolved at runtime from `node_modules`, so `dist/` stays deployable as-is.
- The points ledger queries order by `created_at ASC, rowid ASC` — the `rowid`
  tiebreak keeps same-millisecond entries in insertion order; a random-UUID
  tiebreak made a redeem test flaky.
- The repo has no commit history yet; there is no git remote.