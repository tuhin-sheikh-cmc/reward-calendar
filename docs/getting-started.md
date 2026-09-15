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

Starts the server with `tsx watch`, so source changes trigger a restart.
Defaults to `http://localhost:3000`.

### Environment variables

| Variable       | Default       | Description                            |
| -------------- | ------------- | -------------------------------------- |
| `PORT`         | `3000`        | Port the server listens on             |
| `HOST`         | `0.0.0.0`     | Interface the server binds             |
| `DATABASE_URL` | `:memory:`    | SQLite file path (or `:memory:`)       |

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

Open the interactive API documentation at <http://localhost:3000/docs>.

## Building for production

```console
npm run build
npm start
```

`npm run build` emits compiled JavaScript to `dist/` via `tsc`; `npm start`
runs the built server. The `better-sqlite3` native binding is loaded from
`node_modules` at runtime, so `dist/` stays deployable as-is.

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