export const migrations: string[] = [
  `
    CREATE TABLE IF NOT EXISTS rewards (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      type      TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
      value     REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS persons (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      role           TEXT NOT NULL DEFAULT 'receiver' CHECK (role IN ('provider', 'receiver')),
      email          TEXT,
      password_hash  TEXT,
      is_active      INTEGER NOT NULL DEFAULT 1,
      points_balance INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `,
  `
    ALTER TABLE persons ADD COLUMN role TEXT NOT NULL DEFAULT 'receiver' CHECK (role IN ('provider', 'receiver'))
  `,
  `
    ALTER TABLE persons ADD COLUMN password_hash TEXT
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_email ON persons (email)
  `,
  `
    CREATE TABLE IF NOT EXISTS point_entries (
      id            TEXT PRIMARY KEY,
      person_id     TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('earned', 'removed', 'redeemed')),
      points        INTEGER NOT NULL,
      reason        TEXT,
      balance_after INTEGER NOT NULL,
      created_at    TEXT NOT NULL
    )
  `,
];

export function migrate(database: { exec(sql: string): void }): void {
  for (const statement of migrations) {
    try {
      database.exec(statement);
    } catch (error) {
      if (!isTolerableMigrationError(error)) {
        throw error;
      }
    }
  }
}

function isTolerableMigrationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  // Re-running an ALTER TABLE ADD COLUMN, or indexing pre-existing rows that
  // still contain duplicate emails, must not stop the service from starting.
  return /duplicate column name/i.test(error.message) || /unique constraint failed/i.test(error.message);
}