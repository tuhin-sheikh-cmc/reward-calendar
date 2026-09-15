import Database from 'better-sqlite3';
import { Database as DatabasePort, RunResult } from './database.js';
import { migrate } from './migrations.js';

export type SqliteValue = string | number | bigint | null | Uint8Array;

export class SqliteDatabase implements DatabasePort {
  private readonly db: Database.Database;

  constructor(url = ':memory:') {
    this.db = new Database(url);
    this.db.pragma('foreign_keys = ON');
    if (url !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL');
    }
    migrate(this.db);
  }

  public async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const info = this.db.prepare(sql).run(...params);
    const result: RunResult = { changes: info.changes };
    const rowid = info.lastInsertRowid;
    if (rowid !== undefined && rowid !== null) {
      result.lastInsertRowid = Number(rowid);
    }
    return result;
  }

  public async query<T = Record<string, SqliteValue>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  public async queryOne<T = Record<string, SqliteValue>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...params);
    return (row ?? null) as T | null;
  }

  public async transaction<T>(operation: () => Promise<T>): Promise<T> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = await operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  public async close(): Promise<void> {
    this.db.close();
  }
}