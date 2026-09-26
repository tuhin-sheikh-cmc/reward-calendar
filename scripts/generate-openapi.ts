import { writeFile } from 'node:fs/promises';
import { buildApp } from '../src/server.js';
import { APP_VERSION } from '../src/version.js';

const DEFAULT_SERVER_URL = 'http://localhost:13002';

const serverUrl = process.env.OPENAPI_SERVER_URL ?? DEFAULT_SERVER_URL;
const specPath = new URL('../docs/openapi.json', import.meta.url);

const app = await buildApp({ openApiVersion: APP_VERSION, serveStatic: false });

try {
  await app.ready();
  const spec = {
    ...app.swagger(),
    servers: [{ url: serverUrl, description: 'Rewards API' }],
  };
  await writeFile(specPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  console.log(`OpenAPI spec written to ${specPath.pathname} (server: ${serverUrl})`);
} finally {
  await app.close();
}
