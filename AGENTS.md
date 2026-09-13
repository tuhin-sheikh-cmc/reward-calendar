# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## Project overview

`rewards` is a small, API-first loyalty/rewards service. It manages reward
configurations (percentage or fixed) and calculates loyalty points earned for a
purchase amount. It is built as a learning/quality reference for how an
API-first TypeScript project with strict SOLID adherence is structured.

## Tech stack

| Concern       | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Runtime       | Node.js >= 20 (ESM, `"type": "module"`)                       |
| Language      | TypeScript 5 (strict, `tsconfig.json`)                        |
| HTTP server   | Fastify 5                                                     |
| API contract  | Zod schemas + `fastify-type-provider-zod` -> OpenAPI/Swagger  |
| Dependency In | hand-rolled composition root (no DI framework)                |
| Testing       | Vitest 3 + `@vitest/coverage-v8`                              |
| Dev runner    | `tsx`                                                         |

## Commands

| Task                  | Command                                  |
| --------------------- | ---------------------------------------- |
| Install deps          | `npm install`                            |
| Run dev server (watch)| `npm run dev`                            |
| Typecheck (src)       | `npm run typecheck`                      |
| Typecheck (src+tests) | `npm run typecheck:test`                 |
| Full check            | `npm run check` (typecheck + tests)      |
| Build (emit dist)     | `npm run build`                          |
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

Endpoints:

| Method | Path               | Description                          |
| ------ | ------------------ | ------------------------------------ |
| GET    | `/health`          | Liveness check                       |
| GET    | `/rewards`         | List rewards (`?active=true` filter) |
| GET    | `/rewards/:id`     | Get one reward                       |
| POST   | `/rewards`         | Create a reward                      |
| DELETE | `/rewards/:id`     | Delete a reward                      |
| POST   | `/rewards/calculate` | Points earned for an amount        |
| GET    | `/docs`            | Swagger UI                           |

## Architecture & SOLID

Layered architecture; dependencies always point **inward** (presentation ->
application -> domain) and never outward.

```
src/
├── domain/          # Pure business logic. NO framework imports, NO I/O.
│   ├── entities/    #   Reward aggregate root
│   ├── errors/      #   DomainError hierarchy -> HTTP status codes
│   ├── repositories/#   Repository & service INTERFACES (ports)
│   └── services/    #   Strategy pattern (percentage/fixed points)
├── application/     # Use cases + composition root. Orchestrates domain.
│   ├── dtos/        #   Input/output data
│   ├── use-cases/   #   One class, one business operation
│   └── di/          #   container.ts = composition root (manual wiring)
├── infrastructure/  # Adapters implementing domain ports (driven side)
│   ├── id/          #   UuidIdGenerator
│   └── repositories/#   InMemoryRewardRepository
└── presentation/    # HTTP layer (driving side)
    ├── mappers/     #   domain <-> network DTO conversion
    ├── plugins/     #   swagger, error-handler
    ├── routes/      #   Fastify route definitions
    └── schemas/     #   Zod API contract (see above)
```

How each SOLID principle is exercised:

- **S**ingle responsibility — one use case per file/class; entities hold their
  own invariants; mappers only map.
- **O**pen/closed — new reward types are added by registering a new
  `PointsCalculationStrategy` in the container, no existing class changes.
- **L**iskov — port implementations (`InMemoryRewardRepository`, fakes) honor
  interface contracts exactly.
- **I**nterface segregation — small focused ports: `RewardRepository`,
  `IdGenerator`, `PointsCalculationStrategy`.
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
  adapters (`tests/helpers/fake-reward-repository.ts`).
- Route/HTTP behaviors are tested through `app.inject(...)` against
  `buildApp()` (see `tests/unit/presentation/rewards.routes.test.ts`).
- The container's `InMemoryRewardRepository` is shared state — tests should
  `container.rewardRepository.clear()` in `beforeEach`.

## Testing patterns

- Pure unit tests: entity invariants, strategy math, each use case with a fake
  repository / stub id generator.
- Integration-style: `POST/GET/DELETE` + validation failures + 404s via
  `app.inject`.
- Ratecheck: `npm run check` before pushing. Keep coverage >= 80%.

## Gotchas

- `exactOptionalPropertyTypes` is on — do not assign `undefined` explicitly to
  optional fields (the swagger config must omit keys rather than set them to
  `undefined`).
- The repo is not yet a git repository; there is no commit history.