/**
 * Bootstrap CLI: creates the first person (and therefore the first account)
 * straight in the database, because every HTTP route that creates a person
 * requires a bearer token.
 *
 *   npm run create:user -- --email ada@example.com --password a-strong-password
 *   DATABASE_URL=/data/rewards.db node dist/scripts/create-user.js --email ... --password ...
 */
import { pathToFileURL } from 'node:url';
import { CreatePersonInput } from '../application/dtos/person.dtos.js';
import { Person } from '../domain/entities/person.js';
import { createPersonRequestSchema } from '../presentation/schemas/person.schemas.js';

export interface CreateUserOptions {
  email: string;
  password: string;
  name: string;
  role: 'provider' | 'receiver';
}

export interface CreateUserSuccess {
  ok: true;
  person: Person;
}

export interface CreateUserFailure {
  ok: false;
  message: string;
  details?: string[];
}

export type CreateUserResult = CreateUserSuccess | CreateUserFailure;

const USAGE =
  'Usage: create-user --email <email> --password <password> [--name <name>] [--role provider|receiver]';

export function parseArgs(argv: string[]): CreateUserOptions | { error: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || value === undefined || !key.startsWith('--')) {
      return { error: `Expected --key value pairs, got "${key ?? ''}"` };
    }
    values.set(key.slice(2), value);
  }

  const email = values.get('email');
  const password = values.get('password');
  if (email === undefined || password === undefined) {
    return { error: 'Both --email and --password are required' };
  }

  const role = values.get('role') ?? 'receiver';
  if (role !== 'provider' && role !== 'receiver') {
    return { error: `--role must be "provider" or "receiver", got "${role}"` };
  }

  return {
    email,
    password,
    name: values.get('name') ?? email.split('@')[0] ?? 'Member',
    role,
  };
}

export async function runCreateUser(
  argv: string[],
  createPerson: (input: CreatePersonInput) => Promise<Person>,
): Promise<CreateUserResult> {
  const parsedArgs = parseArgs(argv);
  if ('error' in parsedArgs) {
    return { ok: false, message: `${parsedArgs.error}\n${USAGE}` };
  }

  const parsedInput = createPersonRequestSchema.safeParse({
    name: parsedArgs.name,
    role: parsedArgs.role,
    email: parsedArgs.email,
    password: parsedArgs.password,
  });
  if (!parsedInput.success) {
    return {
      ok: false,
      message: 'Invalid input:',
      details: parsedInput.error.issues.map(
        (issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`,
      ),
    };
  }

  try {
    return { ok: true, person: await createPerson(parsedInput.data) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not create the person',
    };
  }
}

async function main(): Promise<void> {
  const { container } = await import('../application/di/container.js');
  const result = await runCreateUser(process.argv.slice(2), (input) =>
    container.createPerson.execute(input),
  );

  if (result.ok) {
    console.log(
      `Created person ${result.person.id} <${result.person.email}> (${result.person.role})`,
    );
    console.log('Sign in with: POST /api/v1/auth/login');
  } else {
    console.error(result.message);
    for (const detail of result.details ?? []) {
      console.error(`  - ${detail}`);
    }
    process.exitCode = 1;
  }

  await container.database.close();
}

const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  await main();
}
