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
      if (!isDuplicateColumnError(error)) {
        throw error;
      }
    }
  }
}

function isDuplicateColumnError(error: unknown): boolean {
  return (
    error instanceof Error && /duplicate column name/i.test(error.message)
  );
}