import { describe, expect, it } from 'vitest';
import { ListPointsEntriesUseCase } from '../../../src/application/use-cases/list-points-entries.use-case.js';
import { PointsEntry } from '../../../src/domain/entities/points-entry.js';
import { Person } from '../../../src/domain/entities/person.js';
import { NotFoundError } from '../../../src/domain/errors/domain-error.js';
import { FakePersonRepository } from '../../helpers/fake-person-repository.js';
import { FakePointsRepository } from '../../helpers/fake-points-repository.js';

function entryAt(id: string, points: number, createdAt: string): PointsEntry {
  return PointsEntry.fromSnapshot({
    id,
    personId: 'p1',
    type: 'earned',
    points,
    balanceAfter: points,
    createdAt: new Date(createdAt),
  });
}

async function setup(): Promise<{ persons: FakePersonRepository; points: FakePointsRepository }> {
  const persons = new FakePersonRepository();
  const points = new FakePointsRepository();
  await persons.seed(
    Person.create({
      id: 'p1',
      name: 'Ada',
      role: 'receiver',
      email: 'ada@example.com',
      passwordHash: 'hashed:secret',
    }),
  );
  await points.record(entryAt('e1', 10, '2026-01-01T00:00:00.000Z'));
  await points.record(entryAt('e2', 20, '2026-01-02T00:00:00.000Z'));
  await points.record(entryAt('e3', 30, '2026-01-03T00:00:00.000Z'));
  return { persons, points };
}

describe('ListPointsEntriesUseCase', () => {
  it('returns the newest entries first with pagination metadata', async () => {
    const { persons, points } = await setup();
    const useCase = new ListPointsEntriesUseCase(persons, points);

    const firstPage = await useCase.execute({ personId: 'p1', limit: 2, offset: 0 });

    expect(firstPage.entries.map((entry) => entry.id)).toEqual(['e3', 'e2']);
    expect(firstPage.total).toBe(3);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.limit).toBe(2);
    expect(firstPage.offset).toBe(0);
  });

  it('returns the remaining entries and reports no more pages', async () => {
    const { persons, points } = await setup();
    const useCase = new ListPointsEntriesUseCase(persons, points);

    const secondPage = await useCase.execute({ personId: 'p1', limit: 2, offset: 2 });

    expect(secondPage.entries.map((entry) => entry.id)).toEqual(['e1']);
    expect(secondPage.hasMore).toBe(false);
  });

  it('throws NotFoundError when the person does not exist', async () => {
    const { persons, points } = await setup();
    const useCase = new ListPointsEntriesUseCase(persons, points);

    await expect(
      useCase.execute({ personId: 'missing', limit: 100, offset: 0 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
