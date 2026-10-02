# Development & testing

This project is written to be reviewed as a quality reference. Stick to the
conventions below so the architecture stays consistent.

## Commands

| Task                  | Command                                  |
| --------------------- | ---------------------------------------- |
| Install deps          | `npm install`                            |
| Run dev server (watch)| `npm run dev`                            |
| Typecheck (src)       | `npm run typecheck`                      |
| Typecheck (src+tests) | `npm run typecheck:test`                 |
| Typecheck (frontend)  | `npm run typecheck:web`                  |
| Full check            | `npm run check` (typecheck + tests)      |
| Run tests             | `npm test`                               |
| Run tests + coverage  | `npm run test:coverage`                  |
| Build (emit dist)     | `npm run build`                          |
| Build web assets only | `npm run build:web`                       |
| Start built server    | `npm start`                              |

`npm run dev` builds the web assets once, then runs the API under `tsx watch`
and watches `frontend/` + `public/` in parallel (concurrently). The output is
`public/` — pages stitched by `scripts/build-html.mjs`, styles compiled by
Tailwind, and `main.ts` bundled by esbuild. `public/` is generated and
git-ignored; never edit it by hand.

Run `npm run check` before pushing. The coverage threshold is **80%** on
statements/branches/functions/lines (`vitest.config.ts`); dropping below it
fails `npm run test:coverage`.

## Conventions

- **ESM only.** Relative imports MUST use the `.js` extension even when the
  file is `.ts` (required by `moduleResolution: NodeNext`):

  ```ts
  import { Reward } from '../../domain/entities/reward.js';
  ```

- `tsconfig.json` builds `src/` only. `tsconfig.test.json` (noEmit) typechecks
  `src/` + `tests/` + config files. `tsconfig.web.json` (noEmit) typechecks the
  frontend with DOM libs and `moduleResolution: Bundler`. Update the relevant
  config when adding source files.
- Frontend TS lives in `frontend/ts/` (separate type space, bundled by esbuild;
  relative imports still use the `.js` extension). Browser code must never
  inject user data via `innerHTML` — build DOM with
  `textContent`/`createElement`.

- **Business rules go in the domain layer**, never in routes or use cases. If
  an invariant matters, model it on the entity (see `Reward.create`).

- **HTTP status mapping happens only in**
  `presentation/plugins/error-handler.ts`. Domain errors carry a `statusCode`;
  the transport layer owns the rest of the rendering. Routes never build error
  payloads.

- **Keep the API-first contract current.** When a route changes, update the
  Zod schema in `presentation/schemas/`, the inferred type, and this
  documentation (`docs/api.md`).

- **Add new endpoints in their own route folder modules** and register them
  from `src/server.ts` under the shared `API_PREFIX` (`/api/v1`). A future
  major version bump means registering the new routes under `/api/v2` (and
  optionally keeping v1 mounted).

## Testing patterns

Tests live in `tests/`, mirroring the `src/` structure:

```
tests/
├── helpers/                              # shared fakes/stubs
│   ├── fake-reward-repository.ts         #   implements RewardRepository
│   ├── fake-person-repository.ts         #   implements PersonRepository
│   └── fake-points-repository.ts         #   implements PointsRepository
└── unit/
    ├── domain/                           # entity invariants, strategy math
    ├── application/                      # each use case + fake repo / stub id gen
    ├── infrastructure/                   # repo adapter behavior (Sqlite* + Database)
    └── presentation/                     # routes tested via app.inject(...)
```

- **Pure unit tests** target entity invariants, strategy math, and each use
  case with a fake repository / stub id generator. Fakes implement the same
  domain interfaces as the real adapters.
- **Route/HTTP behavior** is tested through `app.inject(...)` against
  `buildApp()` — see `tests/unit/presentation/rewards.routes.test.ts`. This
  exercises validation failures, 404s, status codes, and serialization.
- **Repository adapters** are tested against a fresh
  `SqliteDatabase(':memory:')` in `tests/unit/infrastructure/sqlite-repositories.test.ts`.
- **Static serving** is covered by
  `tests/unit/presentation/frontend.routes.test.ts`, which runs
  `npm run build:web` in `beforeAll` and then asserts `/`, the CSS, and the JS
  bundle are served from `public/`.
- The composition root's repositories are **shared state** backed by one
  SQLite connection (default `:memory:`) — tests should clear
  `container.rewardRepository`, `container.personRepository` and
  `container.pointsRepository` in `beforeEach` (and close the app in
  `afterEach`).

Example route test:

```ts
const app = await buildApp();
const response = await app.inject({ method: 'GET', url: '/api/v1/healthCheck' });
expect(response.statusCode).toBe(200);
expect(response.json().status).toBe('OK');
await app.close();
```

For a protected endpoint, sign in first (or mint a token with the helper):

```ts
const auth = tokenHeaders(app); // tests/helpers/auth.ts
const response = await app.inject({
  method: 'GET',
  url: '/api/v1/persons',
  headers: auth,
});
```

## Adding a new reward type

1. Implement a new `PointsCalculationStrategy` in
   `src/domain/services/reward-points-calculator.ts` (or its own file).
2. Register it in `src/application/di/container.ts`.
3. Extend the `rewardTypeSchema` enum in
   `src/presentation/schemas/reward.schemas.ts`.
4. Add tests for the strategy math and (if exposed) the API pipeline.

No existing classes need to change — this is the **open/closed** property the
architecture is designed to preserve.

## Adding a new database adapter

The storage port is `src/infrastructure/database/database.ts`
(`run`, `query`, `queryOne`, `transaction`, `close`). To support MariaDB,
PostgreSQL, or any other store:

1. Implement the `Database` port (e.g. `src/infrastructure/database/postgres.database.ts`).
2. If the SQL dialect differs (placeholders, types), keep migrations in
   `migrations.ts` dialect-neutral or provide a per-adapter migration set.
3. Swap the adapter at the composition root only
   (`src/application/di/container.ts`):

   ```ts
   const database = new PostgresDatabase(connectionString);
   const rewardRepository = new SqliteRewardRepository(database); // -> a Postgres variant
   ```

Use cases, routes, mappers, and tests are untouched as long as the
repositories honor their domain ports.

## Gotchas

- Fastify does **not** apply hooks passed in `app.register(plugin, { onRequest })`
  options to the routes inside that plugin. The bearer guard is therefore
  installed with `instance.addHook('onRequest', requireAuth)` inside the route
  plugin in `src/server.ts` — moving it back to the register options silently
  disables authentication on every protected endpoint.
- Route tests for protected endpoints need an `Authorization` header; use
  `tokenHeaders(app)` from `tests/helpers/auth.ts` (it signs a real JWT with the
  app's own secret) instead of hand-writing one. For provider-only endpoints,
  pass claims: `tokenHeaders(app, { sub: provider.id, role: 'provider' })`, since
  the actor is read from the token, not the body.
- `scrypt` does not have a 4-argument promisified overload in `@types/node`;
  `ScryptPasswordHasher` wraps the callback form in a `Promise` explicitly.
- `exactOptionalPropertyTypes` is on — do not assign `undefined` explicitly to
  optional fields (e.g. the swagger config must omit keys rather than set them
  to `undefined`). Where a Zod schema makes a field optional, build the object
  conditionally instead of spreading a `string | undefined` value, e.g.
  `{ ...(input.email !== undefined ? { email: input.email } : {}) }`.
- `zod` literal types require a `const` assertion when returning them from a
  handler (see `status: 'OK' as const` in `health.routes.ts`), otherwise the
  widened `string` type fails the response-schema typecheck.
- `better-sqlite3` is a **native module** — its install script must stay in the
  `allowScripts` list of `package.json` or fresh installs will fail to build
  the binding. `esbuild` and `@parcel/watcher` (Tailwind watch) are on the same
  list and must be kept too.
- The points ledger query orders by `created_at ASC, rowid ASC` — the `rowid`
  tiebreak keeps same-millisecond entries in insertion order (a random-UUID
  tiebreak made a redeem test flaky).
- Data is not persisted by default (`:memory:` database) — every restart
  starts empty. Set `DATABASE_URL=./data/rewards.db` (the `*.db*` / `data/`
  paths are git-ignored) to keep data across restarts.