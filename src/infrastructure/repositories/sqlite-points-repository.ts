import { PointsEntry } from '../../domain/entities/points-entry.js';
import { PointsEntryProperties } from '../../domain/entities/points-entry.js';
import { PointsEntryType } from '../../domain/entities/points-entry.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';
import { Database } from '../database/database.js';

interface PointsEntryRow {
  id: string;
  person_id: string;
  type: string;
  points: number;
  reason: string | null;
  balance_after: number;
  created_at: string;
}

function mapRow(row: PointsEntryRow | null): PointsEntry | null {
  if (!row) {
    return null;
  }
  const snapshot: PointsEntryProperties = {
    id: row.id,
    personId: row.person_id,
    type: row.type as PointsEntryType,
    points: row.points,
    balanceAfter: row.balance_after,
    createdAt: new Date(row.created_at),
  };
  if (row.reason !== null) {
    snapshot.reason = row.reason;
  }
  return PointsEntry.fromSnapshot(snapshot);
}

export class SqlitePointsRepository implements PointsRepository {
  constructor(private readonly db: Database) {}

  public async record(entry: PointsEntry): Promise<void> {
    await this.db.run(
      `INSERT INTO point_entries (id, person_id, type, points, reason, balance_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.personId,
        entry.type,
        entry.points,
        entry.reason ?? null,
        entry.balanceAfter,
        entry.createdAt.toISOString(),
      ],
    );
  }

  public async findByPersonId(personId: string): Promise<PointsEntry[]> {
    const rows = await this.db.query<PointsEntryRow>(
      'SELECT id, person_id, type, points, reason, balance_after, created_at FROM point_entries WHERE person_id = ? ORDER BY created_at ASC, id ASC',
      [personId],
    );
    return rows.map((row) => mapRow(row) as PointsEntry);
  }

  public async removeByPersonId(personId: string): Promise<void> {
    await this.db.run('DELETE FROM point_entries WHERE person_id = ?', [personId]);
  }

  public async clear(): Promise<void> {
    await this.db.run('DELETE FROM point_entries');
  }
}