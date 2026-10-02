# API reference

The API contract is defined once as Zod schemas in
`src/presentation/schemas/`. Fastify validates every request against them and
serializes responses against the matching response schema. An interactive
OpenAPI/Swagger spec is available at `GET /docs`.

Base URL: `http://localhost:3000` (development default), or
`http://localhost:13002` (container default).

## OpenAPI specification

| Artifact                                       | Purpose                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `GET /docs`                                    | Swagger UI served by the API itself                                  |
| `GET /docs/json`, `GET /docs/yaml`             | Spec generated on the fly from the Zod schemas                       |
| [`openapi.json`](./openapi.json)               | Committed snapshot of the same spec, for tooling and for the docs UI container |

## Endpoint summary

| Method | Path                       | Auth | Description                              |
| ------ | -------------------------- | ----- | ---------------------------------------- |
| GET    | `/api/v1/healthCheck`      | public | Liveness + app version                   |
| POST   | `/api/v1/auth/login`       | public | Exchange email + password for a JWT      |
| GET    | `/api/v1/rewards`          | bearer | List rewards (`?active=true` filter)     |
| GET    | `/api/v1/rewards/:id`      | bearer | Get one reward                           |
| POST   | `/api/v1/rewards`          | bearer | Create a reward                          |
| DELETE | `/api/v1/rewards/:id`      | bearer | Delete a reward                          |
| POST   | `/api/v1/rewards/calculate`| bearer | Points earned for a purchase amount      |
| GET    | `/api/v1/persons`          | bearer | List persons                             |
| GET    | `/api/v1/persons/:id`      | bearer | Get one person (+ points balance)        |
| POST   | `/api/v1/persons`          | bearer | Create a person (role `provider` or `receiver`) with credentials |
| PUT    | `/api/v1/persons/:id`      | bearer | Update a person (role, email, password mutable) |
| DELETE | `/api/v1/persons/:id`      | bearer | Delete a person                                |
| GET    | `/api/v1/persons/:id/points` | bearer (self/provider) | Points ledger (latest 100, newest first) |
| POST   | `/api/v1/points/add`       | bearer (provider) | Grant points (provider actor from the JWT, never to self) |
| POST   | `/api/v1/points/remove`    | bearer (provider) | Remove points from a person                    |
| POST   | `/api/v1/points/redeem`    | bearer | Redeem a person's points                 |
| GET    | `/docs`                    | public | Swagger UI                               |

## Common response fields

Every non-empty JSON response (successful or error) carries two envelope
fields, declared once as `appMetaSchema`:

| Field        | Type   | Description                                        |
| ------------ | ------ | -------------------------------------------------- |
| `appVersion` | string | Version read from `package.json` (`src/version.ts`) |
| `timestamp`  | number | Epoch milliseconds when the response was produced   |

The `204` delete endpoints return no body and so carry no envelope.

## Common error format

Validation and domain failures share a consistent payload. The default Fastify
Zod-based contract enforcement is handled by the error-handler plugin
(`src/presentation/plugins/error-handler.ts`).

```json
{
  "statusCode": 404,
  "error": "NotFoundError",
  "message": "Reward with id \"<id>\" was not found",
  "appVersion": "1.0.0",
  "timestamp": 1775068100000
}
```

| statusCode | error             | Trigger                                    |
| ---------- | ----------------- | ------------------------------------------ |
| 400        | `ValidationError` | Zod schema validation failed               |
| 401        | `UnauthorizedError` | Missing/invalid bearer token, or bad credentials |
| 403        | `ForbiddenError`  | Role/self-award rule violated, inactive member, or duplicate email (`ConflictError`) |
| 404        | `NotFoundError`   | Reward or person does not exist            |
| 500        | `InternalServerError` | Unexpected error (logged, generic body) |

## GET /api/v1/healthCheck

Liveness and version check. No parameters.

Response `200`:

```json
{
  "status": "OK",
  "appVersion": "1.0.0",
  "timestamp": 1775068100000
}
```

- `status` — literal `"OK"`.
- `appVersion` — version read from `package.json` at startup (`src/version.ts`).
- `timestamp` — epoch milliseconds of the response (`Date.now()`).

## Authentication

All endpoints except `GET /api/v1/healthCheck`, `POST /api/v1/auth/login` and the
Swagger/static routes require a bearer token. Tokens are HS256 JWTs signed with
`JWT_SECRET` (default `puroshkar-development-secret`) and expire after
`JWT_TTL_SECONDS` (default `3600`).

```bash
TOKEN=$(curl -s -X POST http://localhost:13002/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"a-strong-password"}' | jq -r .token)

curl -s http://localhost:13002/api/v1/persons -H "authorization: Bearer $TOKEN"
```

Requests without a token, with a malformed token, or with a token whose
signature does not match return `401` with
`{"error":"UnauthorizedError","message":"Missing or invalid bearer token"}`.
The guard is registered with `addHook('onRequest', ...)` inside each protected
route plugin in `src/server.ts`; hooks passed as `register` options are not
applied to nested routes, so do not move it back there.

Credentials are stored hashed (`scrypt`, format
`scrypt$<N>$<r>$<p>$<salt>$<hash>`) by `ScryptPasswordHasher`. The plain
password and the hash are never returned by any endpoint, and changing a
password does not invalidate tokens that were already issued — they remain
valid until they expire.

### POST /api/v1/auth/login

Request body:

| Field      | Type   | Rules                                   |
| ---------- | ------ | --------------------------------------- |
| `email`    | string | valid email, matched case-insensitively |
| `password` | string | 1–200 characters                        |

Response `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "person": {
    "id": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
    "name": "Ada Lovelace",
    "role": "receiver",
    "email": "ada@example.com",
    "isActive": true,
    "pointsBalance": 0,
    "createdAt": "2026-09-13T12:00:00.000Z",
    "updatedAt": "2026-09-13T12:00:00.000Z"
  },
  "appVersion": "1.0.0",
  "timestamp": 1775068100000
}
```

| statusCode | error              | Trigger                                    |
| ---------- | ------------------ | ------------------------------------------ |
| 400        | `ValidationError`  | malformed body                             |
| 401        | `UnauthorizedError`| unknown email or wrong password            |
| 403        | `ForbiddenError`   | the person exists but is inactive          |

Wrong email and wrong password return the same message
(`Invalid email or password`) so the endpoint does not disclose which accounts
exist.

## GET /api/v1/rewards

Lists all rewards. Optional querystring `active=true` filters to active
rewards only.

Response `200`:

```json
{
  "rewards": [
    {
      "id": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
      "name": "Ten percent",
      "type": "percentage",
      "value": 10,
      "isActive": true,
      "createdAt": "2026-09-13T12:00:00.000Z"
    }
  ]
}
```

### Reward object

| Field       | Type     | Description                                   |
| ----------- | -------- | --------------------------------------------- |
| `id`        | UUID     | Reward identifier                             |
| `name`      | string   | 1–100 characters, trimmed                     |
| `type`      | `"percentage" \| "fixed"` | How points are earned           |
| `value`     | number   | > 0; % rate or fixed points                   |
| `isActive`  | boolean  | Whether the reward can earn points            |
| `createdAt` | string   | UTC ISO-8601 timestamp                        |

## GET /api/v1/rewards/:id

Returns a single reward.

- `:id` — UUID path parameter.

Response `200`: a single reward object (see above).

Response `404`: `NotFoundError`.

Response `400`: malformed (non-UUID) id.

## POST /api/v1/rewards

Creates a reward. Rewards start `isActive: true`.

Request body (`application/json`):

```json
{
  "name": "Ten percent",
  "type": "percentage",
  "value": 10
}
```

| Field   | Type     | Rules                          |
| ------- | -------- | ------------------------------ |
| `name`  | string   | trimmed, 1–100 characters      |
| `type`  | enum     | `"percentage"` or `"fixed"`    |
| `value` | number   | `> 0` (finite)                 |

Response `201`:

```json
{
  "id": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "name": "Ten percent",
  "type": "percentage",
  "value": 10,
  "isActive": true,
  "createdAt": "2026-09-13T12:00:00.000Z"
}
```

Response `400`: validation failure.

## DELETE /api/v1/rewards/:id

Deletes a reward.

- `:id` — UUID path parameter.

Response `204` (no body) on success.

Response `404`: reward not found.

## POST /api/v1/rewards/calculate

Calculates the loyalty points earned for a purchase amount against a reward.

Request body (`application/json`):

```json
{
  "rewardId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "amount": 250
}
```

| Field      | Type   | Rules                   |
| ---------- | ------ | ----------------------- |
| `rewardId` | UUID   | must exist and be active |
| `amount`   | number | `> 0`                   |

Response `200`:

```json
{
  "rewardId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "points": 25
}
```

Points rules:

- **percentage**: `Math.floor((value / 100) * amount)`
- **fixed**: `value` points regardless of amount

Response `404`: reward does not exist or is inactive. Response `400`:
validation failure.

## Persons

### GET /api/v1/persons

Lists all persons, each with their current points balance.

Response `200`:

```json
{
  "persons": [
    {
      "id": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
      "name": "Ada Lovelace",
      "role": "receiver",
      "email": "ada@example.com",
      "isActive": true,
      "pointsBalance": 150,
      "createdAt": "2026-09-13T12:00:00.000Z",
      "updatedAt": "2026-09-13T14:30:00.000Z"
    }
  ]
}
```

### Person object

| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| `id`           | UUID     | Person identifier                    |
| `name`         | string   | 1–100 characters, trimmed            |
| `role`         | enum     | `"provider"` or `"receiver"`         |
| `email`        | string   | Valid email, lower-cased, unique      |
| `isActive`     | boolean  | Whether the member is active         |
| `pointsBalance`| integer  | `>= 0`, current loyalty balance      |
| `createdAt`    | string   | UTC ISO-8601 timestamp               |
| `updatedAt`    | string   | UTC ISO-8601 timestamp               |

Roles: only **providers** can grant points, and a provider can grant points to
any other active person (including another provider) — never to themselves.

### GET /api/v1/persons/:id

Returns a single person (with balance). `:id` — UUID path parameter.

Response `200`: a single person object. Response `404`: `NotFoundError`.
Response `400`: malformed (non-UUID) id.

### POST /api/v1/persons

Creates a person together with their login credentials. Persons start
`isActive: true` with `pointsBalance: 0`.

Request body (`application/json`):

```json
{
  "name": "Ada Lovelace",
  "role": "receiver",
  "email": "ada@example.com",
  "password": "a-strong-password"
}
```

| Field      | Type   | Rules                                        |
| ---------- | ------ | -------------------------------------------- |
| `name`     | string | trimmed, 1–100 characters                    |
| `role`     | enum   | `"provider"` or `"receiver"` (required)      |
| `email`    | string | valid email, required, unique (case-insensitive) |
| `password` | string | 8–200 characters, required; stored hashed     |

Response `201`: a single person object. Response `400`: validation failure
(e.g. a missing or unknown `role`). Response `409`: `ConflictError`, the email
is already taken.

### PUT /api/v1/persons/:id

Updates a person's `name` (and optional `email` / `password` / `role`).
`:id` — UUID path parameter.

Request body:

```json
{
  "name": "Ada G.",
  "role": "provider",
  "email": "ada.g@example.com",
  "password": "a-new-password"
}
```

| Field      | Type   | Rules                                        |
| ---------- | ------ | -------------------------------------------- |
| `name`     | string | trimmed, 1–100 characters                    |
| `role`     | enum   | optional; `"provider"` or `"receiver"`        |
| `email`    | string | optional, valid email format, unique         |
| `password` | string | optional, 8–200 characters; stored hashed     |

Omitting `email`, `password` or `role` keeps the current value. Points balance
is managed exclusively through the points endpoints and is not touched here.

Response `200`: the updated person object. Response `404`: person not found.
Response `400`: validation failure. Response `409`: `ConflictError`, the email
belongs to another person.

### DELETE /api/v1/persons/:id

Deletes a person and their ledger entries. `:id` — UUID path parameter.

Response `204` (no body) on success. Response `404`: person not found.

## GET /api/v1/persons/:id/points

Returns a person's points ledger, newest first. A **provider** token may request
anyone's ledger; a **receiver** token may only request its own (`403` otherwise).
`:id` — UUID path parameter.

Query parameters:

| Query    | Type    | Default | Rules                           |
| -------- | ------- | ------- | ------------------------------- |
| `limit`  | integer | `100`   | `1..100`; caps entries returned |
| `offset` | integer | `0`     | `>= 0`; entries to skip         |

Response `200`:

```json
{
  "personId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "entries": [
    {
      "id": "6f9c1e2a-4bae-4c8e-9f3e-1a2b3c4d5e6a",
      "personId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
      "type": "earned",
      "points": 100,
      "reason": "Welcome bonus",
      "balanceAfter": 150,
      "createdAt": "2026-01-03T10:15:00.000Z"
    }
  ],
  "total": 128,
  "limit": 100,
  "offset": 0,
  "hasMore": true
}
```

`hasMore` is true while `offset + entries.length < total`; request the next page
with `offset += entries.length`. Responses: `403` when a receiver asks for
someone else's ledger; `404` when the person does not exist.

## Points operations

All three endpoints share the response shape. `POST /points/add` and
`POST /points/remove` require a **provider** bearer token: the acting provider
is taken from the JWT (`sub`), never from the request body, so a receiver
cannot impersonate one. `remove` and `redeem` take only `personId`.

### POST /api/v1/points/add

Grants (credits) points to a person's balance. The authenticated provider
(from the token) is the grantor, a provider cannot grant points to themselves,
and the receiver must be active.

### POST /api/v1/points/remove

Removes (debits) points from a person's balance. Only a provider can remove
points. Cannot exceed the available balance.

### POST /api/v1/points/redeem

Redeems points against a person's balance. Same rules as remove (must not
exceed the available balance).

`POST /points/add` request body (`application/json`):

```json
{
  "personId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "points": 100,
  "reason": "Welcome bonus"
}
```

| Field      | Type    | Rules                                          |
| ---------- | ------- | ---------------------------------------------- |
| `personId` | UUID    | the receiving person; must exist and be active |
| `points`   | integer | `> 0`                                          |
| `reason`   | string  | optional, trimmed, max 200 chars               |

The grantor is the bearer token's `sub`; a `providerId` sent in the body is
ignored.

`POST /points/remove` and `/points/redeem` request body (`application/json`):

```json
{
  "personId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "points": 100,
  "reason": "Welcome bonus"
}
```

| Field      | Type    | Rules                            |
| ---------- | ------- | -------------------------------- |
| `personId` | UUID    | must exist                       |
| `points`   | integer | `> 0`                            |
| `reason`   | string  | optional, trimmed, max 200 chars |

Response `200`:

```json
{
  "personId": "04b1b9e0-4bae-4c8e-9f3e-1a2b3c4d5e6f",
  "type": "earned",
  "points": 100,
  "balance": 150
}
```

| Field      | Type     | Description                                |
| ---------- | -------- | ------------------------------------------ |
| `personId` | UUID     | The person whose balance changed           |
| `type`     | enum     | `earned` / `removed` / `redeemed`          |
| `points`   | integer  | points applied                             |
| `balance`  | integer  | new total balance after the operation      |

Responses: `404` when a referenced person does not exist; `400` for invalid
input or when a deduction would exceed the balance (message includes the
shortfall); `403` (`ForbiddenError`) when the caller is not a provider, when the
provider is inactive, or when a provider tries to grant to themselves.

Every successful operation appends an entry to the person's points ledger
(`point_entries`), which is an append-only audit trail.

Verify the resulting balance directly on the person:

```json
GET /api/v1/persons/04b1b9e0-... -> { "pointsBalance": 150, ... }
```

## GET /docs

## Errors in detail

### Validation (400)

Sent by the error handler for `ZodError` and built-in request validation:

```json
{
  "statusCode": 400,
  "error": "ValidationError",
  "message": "Request validation failed",
  "issues": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "message": "String must contain at least 1 character(s)",
      "path": ["name"]
    }
  ]
}
```

### Domain errors

Rendered from `DomainError.statusCode` / name / message. A 404 lookup:

```json
{
  "statusCode": 404,
  "error": "NotFoundError",
  "message": "Reward with id \"04b1b9e0-...\" was not found"
}
```

A 403 grant-rule violation:

```json
{
  "statusCode": 403,
  "error": "ForbiddenError",
  "message": "Only providers can grant points"
}
```

A 401 from the bearer guard, and a 409 from a duplicate email:

```json
{
  "statusCode": 401,
  "error": "UnauthorizedError",
  "message": "Missing or invalid bearer token"
}
```

```json
{
  "statusCode": 409,
  "error": "ConflictError",
  "message": "A person with email \"ada@example.com\" already exists"
}
```

### Internal error (500)

The request is logged and a generic response is returned:

```json
{
  "statusCode": 500,
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

## OpenAPI / Swagger

The spec is generated automatically from the Zod schemas and exposed at
`GET /docs` (UI) and `GET /docs/json` / `GET /docs/yaml` (raw spec). The
OpenAPI version is set via `buildApp({ openApiVersion })`.

`docs/openapi.json` is the committed snapshot of that spec. It is never edited
by hand — regenerate it whenever a Zod schema, tag or route changes:

```console
npm run openapi:generate
```

The script boots the app (without the static frontend plugin, so it works on a
fresh clone where `public/` has not been built), reads `app.swagger()` and adds
a `servers` entry, because `@fastify/swagger` only emits `servers` when it is
configured. Override the advertised base URL with `OPENAPI_SERVER_URL`:

```console
OPENAPI_SERVER_URL=https://api.example.com npm run openapi:generate
```

## Standalone API documentation UI

`docker-compose.yml` adds a second service, `swagger-ui`, that renders
`docs/openapi.json` at <http://localhost:13003>:

```console
docker compose up -d --build   # or: podman-compose up -d --build
```

- The service is `swaggerapi/swagger-ui:v5.33.0` (Alpine-based nginx) and
  mounts **the single file** `./docs/openapi.json` read-only, served from the
  same origin as the UI — so the spec loads with no CORS requirement. Mounting
  the whole `docs/` directory would shadow the image's own assets. The `:Z`
  mount option relabels the file so nginx can read it on SELinux hosts (it is
  ignored by Docker on hosts without SELinux); without it nginx answers `403`.
- "Try it out" targets `servers[0].url` in the spec (`http://localhost:13002`),
  which is cross-origin, so the API allows that origin via
  `CORS_ORIGIN` (`src/presentation/plugins/cors.ts`). It is a comma-separated
  allowlist; `*` reflects any origin. The default is
  `http://localhost:13003`, and it is set explicitly on the `puroshkar` service
  in `docker-compose.yml`.
- Because the UI reads the committed file, remember to re-run
  `npm run openapi:generate` after changing a route; the mount is read-only so
  a refresh is all that is needed.
- "Try it out" cannot send an `Authorization` header from the Swagger UI, so
  calls to the protected endpoints answer `401` until the spec's global
  `bearerAuth` requirement is satisfied. Paste a token obtained from
  `POST /api/v1/auth/login` into the `Authorize` dialog.
