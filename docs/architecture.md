# Architecture

`rewards` is a layered, API-first TypeScript service. The guiding rules:

- **Dependencies point inward.** `presentation -> application -> domain`, and
  nothing in an inner layer imports from an outer layer.
- **The API contract is the single source of truth.** Zod schemas declare
  request/response shapes; Fastify uses them for validation, serialization,
  and OpenAPI generation.
- **Domain code stays pure.** No framework imports, no I/O, no HTTP.

## Layer map

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
    ├── plugins/     #   swagger, error-handler
    ├── routes/      #   Fastify route definitions
    └── schemas/     #   Zod API contract (see above)
```

### domain

The core business rules. The aggregates are:

- **`Reward`** — created via the static factory `Reward.create(...)`, which
  validates its own invariants (name length, positive finite value) and refuses
  to exist in an invalid state.
- **`Person`** — a loyalty member with a `PersonRole` (`"provider"` or
  `"receiver"`, extensible later) and a `pointsBalance`, with auto-validating
  operations (`addPoints`, `removePoints`, `redeemPoints`). Deductions reject
  amounts larger than the current balance via a `ValidationError`.
- **`PointsEntry`** — an immutable audit row for every change to a person's
  balance (`earned` / `removed` / `redeemed`), storing the points moved and the
  resulting `balanceAfter`.

The entities own their invariants, not the routes or use cases.

Domain errors extend `DomainError` and carry an HTTP `statusCode`
(`NotFoundError` -> 404, `ValidationError` -> 400, `ConflictError` -> 409,
`ForbiddenError` -> 403).
The domain layer decides *what* went wrong; the transport layer decides *how*
to render it.

Ports (interfaces) live here: `RewardRepository`, `PersonRepository`,
`PointsRepository`, `PointsCalculationStrategy`, `IdGenerator`. Infrastructure
implements them; use cases depend on the interfaces, never the
implementations.

### application

Use cases orchestrate the domain. Each class performs exactly one business
operation and receives its dependencies via constructor injection:

```ts
export class CreateRewardUseCase {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly idGenerator: IdGenerator,
  ) {}
  // execute(input): builds a Reward, saves it, returns it
}
```

Independently of which strategy a reward uses, `RewardPointsCalculator`
dispatches to a strategy keyed by reward type — that dispatch lives in
`src/domain/services/reward-points-calculator.ts`.

### infrastructure

Adapters that implement the domain ports. The database layer lives in
`infrastructure/database/`:

- **`Database`** (port) — the only storage abstraction the repositories see:
  `run`, `query`, `queryOne`, `transaction`, `close`. Because repositories
  depend on this port, MariaDB/PostgreSQL adapters can be added later without
  touching use cases, routes, or tests.
- **`SqliteDatabase`** — `better-sqlite3` implementation; runs the migration
  DDL (`CREATE TABLE IF NOT EXISTS`) on construction and enables foreign keys.
  Uses `:memory:` by default or a file path from `DATABASE_URL`.

`SqliteRewardRepository`, `SqlitePersonRepository` and
`SqlitePointsRepository` implement the domain ports, mapping rows to entities.
An `UuidIdGenerator` produces ids via `crypto.randomUUID()`.

### presentation

The HTTP layer. Fastify routes in `src/presentation/routes/` declare their
schemas upfront, so Fastify validates requests, serializes responses, and
exposes everything in Swagger automatically. Transport types are inferred from
the schemas with `z.infer<typeof schema>`.

Domain-to-network conversion lives in mappers (`toRewardResponse`,
`toPersonResponse`). The error-handler plugin is the *only* place that maps
domain errors to HTTP responses; routes and use cases never format error
payloads themselves.

## Dependency injection (composition root)

There is no DI framework. `src/application/di/container.ts` is the single
composition root that manually wires every dependency:

```ts
const database = new SqliteDatabase(process.env.DATABASE_URL ?? ':memory:');
const rewardRepository = new SqliteRewardRepository(database);
const personRepository = new SqlitePersonRepository(database);
const pointsRepository = new SqlitePointsRepository(database);
const idGenerator = new UuidIdGenerator();

export const container: Container = {
  database,
  rewardRepository,
  personRepository,
  pointsRepository,
  idGenerator,
  createReward: new CreateRewardUseCase(rewardRepository, idGenerator),
  addPoints: new AddPointsUseCase(personRepository, pointsRepository, idGenerator),
  // ...
};
```

New reward types are added **open/closed** style: implement a new
`PointsCalculationStrategy` and register it here. New databases are added the
same way: implement the `Database` port and swap the adapter in the
composition root — use cases, routes, and tests never change.

## Request flow

```
HTTP request
  └─> Fastify route (presentation/routes)
         validates + deserializes via Zod schema
         └─> use case (application/use-cases)
               └─> domain service / entity / repository port
                     └─> infrastructure adapter (Sqlite*Repository)
                           └─> SqliteDatabase (better-sqlite3)
         result mapped to response shape (presentation/mappers)
  └─> serialized against the response schema
HTTP response (or error rendered by presentation/plugins/error-handler)
```

A points adjustment (`POST /points/remove|redeem`) flows through the shared
`AdjustPointsUseCase` base: load the person, apply the domain mutation
(`Person.removePoints`/`redeemPoints` — which enforce invariants like "cannot
deduct more than the balance"), persist the person's new balance, and append a
`PointsEntry` to the ledger with the resulting `balanceAfter`.

Granting (`POST /points/add`) uses the same base but overrides the flow in
`AddPointsUseCase`: it loads the *receiver* and the *granting provider*, then
enforces `GrantPointsPolicy` (only an active provider may grant; never to
oneself) before the shared persistence steps.

## SOLID in practice

| Principle                  | Where it shows up                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------- |
| S — Single responsibility | One use case per file/class; entities hold their own invariants; mappers only map |
| O — Open/closed            | New reward types / databases = new registered strategy / `Database` adapter        |
| L — Liskov                 | Port implementations and fakes honor interface contracts exactly                  |
| I — Interface segregation  | Small focused ports: `RewardRepository`, `PersonRepository`, `PointsRepository`, `IdGenerator`, `PointsCalculationStrategy` |
| D — Dependency inversion   | Domain defines interfaces; infrastructure implements; container wires at runtime  |

## Points calculation

The calculator picks a strategy by reward type:

- **percentage** — `Math.floor((value / 100) * amount)` points
- **fixed** — `value` points regardless of amount

Points are always non-negative integers.

## Points ledger & balance

Every person has a `pointsBalance` (stored on the `persons` row) and an
append-only audit trail of `point_entries`:

| Entry type  | Endpoint            | Effect on balance                |
| ----------- | ------------------- | -------------------------------- |
| `earned`    | `POST /points/add`  | increases                       |
| `removed`   | `POST /points/remove` | decreases (utilization)        |
| `redeemed`  | `POST /points/redeem` | decreases (reward redemption)  |

Deductions (`removed`, `redeemed`) cannot exceed the current balance — the
`Person` entity rejects them with a `ValidationError` (HTTP 400). Each entry
records the points moved, an optional reason, and the `balanceAfter`, so the
ledger can be audited or replayed independently of the stored balance.