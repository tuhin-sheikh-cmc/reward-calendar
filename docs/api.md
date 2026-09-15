# API reference

The API contract is defined once as Zod schemas in
`src/presentation/schemas/`. Fastify validates every request against them and
serializes responses against the matching response schema. An interactive
OpenAPI/Swagger spec is available at `GET /docs`.

Base URL: `http://localhost:3000` (development default).

## Endpoint summary

| Method | Path                       | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/api/v1/healthCheck`      | Liveness + app version                   |
| GET    | `/api/v1/rewards`          | List rewards (`?active=true` filter)     |
| GET    | `/api/v1/rewards/:id`      | Get one reward                           |
| POST   | `/api/v1/rewards`          | Create a reward                          |
| DELETE | `/api/v1/rewards/:id`      | Delete a reward                          |
| POST   | `/api/v1/rewards/calculate`| Points earned for a purchase amount      |
| GET    | `/api/v1/persons`          | List persons                             |
| GET    | `/api/v1/persons/:id`      | Get one person (+ points balance)        |
| POST   | `/api/v1/persons`          | Create a person                          |
| PUT    | `/api/v1/persons/:id`      | Update a person                          |
| DELETE | `/api/v1/persons/:id`      | Delete a person                          |
| POST   | `/api/v1/points/add`       | Add points to a person                   |
| POST   | `/api/v1/points/remove`    | Remove points from a person              |
| POST   | `/api/v1/points/redeem`    | Redeem a person's points                 |
| GET    | `/docs`                    | Swagger UI                               |

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
| 404        | `NotFoundError`   | Reward does not exist                      |
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
| `email`        | string   | Optional, valid email format         |
| `isActive`     | boolean  | Whether the member is active         |
| `pointsBalance`| integer  | `>= 0`, current loyalty balance      |
| `createdAt`    | string   | UTC ISO-8601 timestamp               |
| `updatedAt`    | string   | UTC ISO-8601 timestamp               |

### GET /api/v1/persons/:id

Returns a single person (with balance). `:id` — UUID path parameter.

Response `200`: a single person object. Response `404`: `NotFoundError`.
Response `400`: malformed (non-UUID) id.

### POST /api/v1/persons

Creates a person. Persons start `isActive: true` with `pointsBalance: 0`.

Request body (`application/json`):

```json
{ "name": "Ada Lovelace", "email": "ada@example.com" }
```

`email` is optional.

Response `201`: a single person object. Response `400`: validation failure.

### PUT /api/v1/persons/:id

Replaces a person's `name` (and `email`). `:id` — UUID path parameter.

Request body:

```json
{ "name": "Ada G.", "email": "ada.g@example.com" }
```

Omitting `email` clears it. Points balance is managed exclusively through the
points endpoints and is not touched here.

Response `200`: the updated person object. Response `404`: person not found.
Response `400`: validation failure.

### DELETE /api/v1/persons/:id

Deletes a person and their ledger entries. `:id` — UUID path parameter.

Response `204` (no body) on success. Response `404`: person not found.

## Points operations

All three endpoints share the request/response shape.

### POST /api/v1/points/add

Adds (credits) points to a person's balance.

### POST /api/v1/points/remove

Removes (debits) points from a person's balance. Cannot exceed the available
balance.

### POST /api/v1/points/redeem

Redeems points against a person's balance. Same rules as remove (must not
exceed the available balance).

Request body (`application/json`):

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

Responses: `404` when the person does not exist; `400` for invalid input or
when a deduction would exceed the balance (message includes the shortfall).

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

Rendered from `DomainError.statusCode` / name / message, e.g. a 404 lookup:

```json
{
  "statusCode": 404,
  "error": "NotFoundError",
  "message": "Reward with id \"04b1b9e0-...\" was not found"
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
`GET /docs`. The OpenAPI version is set via `buildApp({ openApiVersion })`.