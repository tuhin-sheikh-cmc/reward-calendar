import { Reward } from '../../domain/entities/reward.js';
import { RewardType } from '../../domain/entities/reward.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';
import { Database } from '../database/database.js';

interface RewardRow {
  id: string;
  name: string;
  type: string;
  value: number;
  is_active: number;
  created_at: string;
}

function mapRow(row: RewardRow | null): Reward | null {
  if (!row) {
    return null;
  }
  return Reward.fromSnapshot({
    id: row.id,
    name: row.name,
    type: row.type as RewardType,
    value: row.value,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
  });
}

export class SqliteRewardRepository implements RewardRepository {
  constructor(private readonly db: Database) {}

  public async save(reward: Reward): Promise<void> {
    await this.db.run(
      `INSERT INTO rewards (id, name, type, value, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         value = excluded.value,
         is_active = excluded.is_active`,
      [
        reward.id,
        reward.name,
        reward.type,
        reward.value,
        reward.isActive ? 1 : 0,
        reward.createdAt.toISOString(),
      ],
    );
  }

  public async findById(id: string): Promise<Reward | null> {
    const row = await this.db.queryOne<RewardRow>(
      'SELECT id, name, type, value, is_active, created_at FROM rewards WHERE id = ?',
      [id],
    );
    return mapRow(row);
  }

  public async findAll(): Promise<Reward[]> {
    const rows = await this.db.query<RewardRow>(
      'SELECT id, name, type, value, is_active, created_at FROM rewards ORDER BY created_at ASC, id ASC',
    );
    return rows.map((row) => mapRow(row) as Reward);
  }

  public async remove(id: string): Promise<void> {
    await this.db.run('DELETE FROM rewards WHERE id = ?', [id]);
  }

  public async clear(): Promise<void> {
    await this.db.run('DELETE FROM rewards');
  }
}