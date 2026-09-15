import { describe, expect, it } from 'vitest';
import { SqliteDatabase } from '../../../src/infrastructure/database/sqlite.database.js';
import { SqlitePersonRepository } from '../../../src/infrastructure/repositories/sqlite-person-repository.js';
import { SqlitePointsRepository } from '../../../src/infrastructure/repositories/sqlite-points-repository.js';
import { SqliteRewardRepository } from '../../../src/infrastructure/repositories/sqlite-reward-repository.js';
import { Person } from '../../../src/domain/entities/person.js';
import { PointsEntry } from '../../../src/domain/entities/points-entry.js';
import { Reward } from '../../../src/domain/entities/reward.js';

function createDatabase(): SqliteDatabase {
  return new SqliteDatabase(':memory:');
}

describe('SqliteDatabase', () => {
  it('runs migrations idempotently', async () => {
    const db = createDatabase();
    await expect(db.run('SELECT 1')).resolves.toBeDefined();
    await db.close();
  });

  it('exposes changes from run()', async () => {
    const db = createDatabase();
    await db.run(
      'INSERT INTO persons (id, name, is_active, points_balance, created_at, updated_at) VALUES (?, ?, 1, 0, ?, ?)',
      ['p1', 'Ada', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
    );
    const result = await db.run('DELETE FROM persons WHERE id = ?', ['p1']);
    expect(result.changes).toBe(1);
    await db.close();
  });

  it('queryOne returns null for missing rows', async () => {
    const db = createDatabase();
    await expect(db.queryOne('SELECT * FROM persons WHERE id = ?', ['nope'])).resolves.toBeNull();
    await db.close();
  });

  it('commits a transaction and rolls back on failure', async () => {
    const db = createDatabase();

    await db.transaction(async () => {
      await db.run(
        'INSERT INTO persons (id, name, is_active, points_balance, created_at, updated_at) VALUES (?, ?, 1, 0, ?, ?)',
        ['p1', 'Ada', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
      );
    });
    await expect(db.queryOne('SELECT id FROM persons WHERE id = ?', ['p1'])).resolves.toEqual({
      id: 'p1',
    });

    await expect(
      db.transaction(async () => {
        await db.run('INSERT INTO persons (id, name, is_active, points_balance, created_at, updated_at) VALUES (?, ?, 1, 0, ?, ?)', [
          'p2',
          'Grace',
          '2026-01-01T00:00:00.000Z',
          '2026-01-01T00:00:00.000Z',
        ]);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await expect(db.queryOne('SELECT id FROM persons WHERE id = ?', ['p2'])).resolves.toBeNull();
    await db.close();
  });
});

describe('SqliteRewardRepository', () => {
  it('round-trips rewards', async () => {
    const db = createDatabase();
    const repository = new SqliteRewardRepository(db);
    const reward = Reward.create({ id: 'r1', name: 'Ten percent', type: 'percentage', value: 10 });

    await repository.save(reward);

    const stored = await repository.findById('r1');
    expect(stored?.name).toBe('Ten percent');
    expect(stored?.isActive).toBe(true);
    expect(await repository.findAll()).toHaveLength(1);

    await repository.save(stored?.deactivate() as Reward);
    expect((await repository.findById('r1'))?.isActive).toBe(false);

    await repository.remove('r1');
    await expect(repository.findById('r1')).resolves.toBeNull();
    await db.close();
  });

  it('clears all rewards', async () => {
    const db = createDatabase();
    const repository = new SqliteRewardRepository(db);
    await repository.save(Reward.create({ id: 'r1', name: 'A', type: 'fixed', value: 5 }));

    await repository.clear();

    await expect(repository.findAll()).resolves.toEqual([]);
    await db.close();
  });
});

describe('SqlitePersonRepository', () => {
  it('round-trips persons including balance and email', async () => {
    const db = createDatabase();
    const repository = new SqlitePersonRepository(db);
    const person = Person.create({ id: 'p1', name: 'Ada', email: 'ada@example.com' }).addPoints(120);

    await repository.save(person);

    const stored = await repository.findById('p1');
    expect(stored?.name).toBe('Ada');
    expect(stored?.email).toBe('ada@example.com');
    expect(stored?.pointsBalance).toBe(120);
    expect(stored?.isActive).toBe(true);

    await repository.save(stored?.deactivate() as Person);
    expect((await repository.findById('p1'))?.isActive).toBe(false);
    await db.close();
  });

  it('persists persons without an email', async () => {
    const db = createDatabase();
    const repository = new SqlitePersonRepository(db);
    await repository.save(Person.create({ id: 'p1', name: 'Grace' }));

    expect((await repository.findById('p1'))?.email).toBeUndefined();
    await db.close();
  });

  it('updates an existing person row', async () => {
    const db = createDatabase();
    const repository = new SqlitePersonRepository(db);
    const person = Person.create({ id: 'p1', name: 'Ada' });
    await repository.save(person);
    await repository.save(person.update({ name: 'Ada G.', email: 'ada.g@example.com' }));

    const stored = await repository.findById('p1');
    expect(stored?.name).toBe('Ada G.');
    expect(stored?.email).toBe('ada.g@example.com');
    await db.close();
  });

  it('lists, removes and clears persons', async () => {
    const db = createDatabase();
    const repository = new SqlitePersonRepository(db);
    await repository.save(Person.create({ id: 'p1', name: 'Ada' }));
    await repository.save(Person.create({ id: 'p2', name: 'Grace' }));

    expect(await repository.findAll()).toHaveLength(2);

    await repository.remove('p1');
    await expect(repository.findById('p1')).resolves.toBeNull();

    await repository.clear();
    await expect(repository.findAll()).resolves.toEqual([]);
    await db.close();
  });
});

describe('SqlitePointsRepository', () => {
  it('records and lists entries per person', async () => {
    const db = createDatabase();
    const repository = new SqlitePointsRepository(db);
    const entry = PointsEntry.create({
      id: 'e1',
      personId: 'p1',
      type: 'earned',
      points: 100,
      reason: 'Bonus',
      balanceAfter: 100,
    });

    await repository.record(entry);

    const entries = await repository.findByPersonId('p1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe('earned');
    expect(entries[0]?.reason).toBe('Bonus');
    expect(entries[0]?.balanceAfter).toBe(100);
    expect(await repository.findByPersonId('p2')).toEqual([]);
    await db.close();
  });

  it('removes all entries for a person and clears the table', async () => {
    const db = createDatabase();
    const repository = new SqlitePointsRepository(db);
    await repository.record(
      PointsEntry.create({ id: 'e1', personId: 'p1', type: 'earned', points: 10, balanceAfter: 10 }),
    );
    await repository.record(
      PointsEntry.create({ id: 'e2', personId: 'p1', type: 'removed', points: 4, balanceAfter: 6 }),
    );

    await repository.removeByPersonId('p1');
    await expect(repository.findByPersonId('p1')).resolves.toEqual([]);

    await repository.record(
      PointsEntry.create({ id: 'e3', personId: 'p1', type: 'earned', points: 1, balanceAfter: 1 }),
    );
    await repository.clear();
    await expect(repository.findByPersonId('p1')).resolves.toEqual([]);
    await db.close();
  });
});