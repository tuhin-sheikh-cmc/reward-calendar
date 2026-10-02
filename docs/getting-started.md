# Getting started

## Prerequisites

- Node.js >= 20 (ESM project, `"type": "module"`)
- npm (bundled with Node)

## Installation

```console
npm install
```

## Running in development

```console
npm run dev
```

Starts the API under `tsx watch` (source changes restart it), builds the web
assets once, and watches `frontend/` + `public/` so HTML, CSS, and JS changes
rebuild automatically. Defaults to `http://localhost:3000`.

The homepage at <http://localhost:3000/> shows a sign-in form; after a
successful `POST /api/v1/auth/login` the JWT is kept in `sessionStorage` and the
receiver members with their points balances are listed (Material 3 cards).
Source lives in `frontend/` (pages, partials, styles, TS) and is compiled into
`public/`, which Fastify serves statically.

### Environment variables

| Variable          | Default                          | Description                            |
| ----------------- | -------------------------------- | -------------------------------------- |
| `PORT`            | `3000`                           | Port the server listens on             |
| `HOST`            | `0.0.0.0`                        | Interface the server binds             |
| `DATABASE_URL`    | `:memory:`                       | SQLite file path (or `:memory:`)       |
| `JWT_SECRET`      | `puroshkar-development-secret`    | HMAC secret every issued token is signed with |
| `JWT_TTL_SECONDS` | `3600`                           | Token lifetime in seconds              |
| `CORS_ORIGIN`     | `http://localhost:13003`         | Comma-separated browser origin allowlist (`*` reflects any) |

`JWT_SECRET` and `JWT_TTL_SECONDS` are read by
`src/presentation/plugins/auth.ts`; changing the secret invalidates every token
issued with the previous one.

By default the service uses an ephemeral **in-memory** SQLite database — every
restart loses data. To persist across restarts, point `DATABASE_URL` at a file:

```console
DATABASE_URL=./data/rewards.db npm run dev
```

The `data/` directory and `*.db*` files are git-ignored.

## Verifying it works

```console
curl http://localhost:3000/api/v1/healthCheck
```

Example response:

```json
{
  "status": "OK",
  "appVersion": "1.0.0",
  "timestamp": 1775068100000
}
```

Then create the first account. Every HTTP route that writes persons is
authenticated, so the initial member comes from a CLI that writes straight to
the database:

```console
npm run create:user -- --email ada@example.com --password a-strong-password --name "Ada Lovelace"
```

It reuses the same `CreatePersonUseCase`, so validation (8–200 character
password, unique email) and hashing are identical to the API. Sign in with it:

```console
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"a-strong-password"}'
```

Copy the returned `token` and call a protected endpoint with it:

```console
curl http://localhost:3000/api/v1/persons -H "authorization: Bearer <token>"
```

Open the interactive API documentation at <http://localhost:3000/docs>.

## Building for production

```console
npm run build
npm start
```

`npm run build` compiles the API to `dist/` via `tsc` *and* produces the web
assets in `public/` (`build:api` + `build:web`); `npm start` runs the built
server, which serves both the API and the static frontend. The
`better-sqlite3` native binding is loaded from `node_modules` at runtime, so
`dist/` stays deployable as-is.

## Versioning the API

The health check reports the app version via `buildApp({ appVersion })`
(default `"1.0.0"`). The same value can be passed for the OpenAPI info via
`openApiVersion`. For example:

```ts
const app = await buildApp({ appVersion: '1.1.0', openApiVersion: '1.1.0' });
```

## Configuration reference

All configuration flows through the `buildApp(options)` factory in
`src/server.ts`:

```ts
export interface AppOptions {
  logger?: boolean;        // enable Fastify request logging (default false)
  openApiVersion?: string; // version shown in the OpenAPI spec
  appVersion?: string;     // version reported by /api/v1/healthCheck
}
```