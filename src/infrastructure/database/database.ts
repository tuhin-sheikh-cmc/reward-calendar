export interface RunResult {
  changes: number;
  lastInsertRowid?: number;
}

export interface Database {
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}