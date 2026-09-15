import { describe, expect, it } from 'vitest';
import { AddPointsUseCase } from '../../../src/application/use-cases/add-points.use-case.js';
import { RedeemPointsUseCase } from '../../../src/application/use-cases/redeem-points.use-case.js';
import { RemovePointsUseCase } from '../../../src/application/use-cases/remove-points.use-case.js';
import { Person } from '../../../src/domain/entities/person.js';
import { ValidationError } from '../../../src/domain/errors/domain-error.js';
import { FakePersonRepository } from '../../helpers/fake-person-repository.js';
import { FakePointsRepository } from '../../helpers/fake-points-repository.js';

describe('AddPointsUseCase', () => {
  it('adds points, saves the person and records an earned entry', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada' }));
    const useCase = new AddPointsUseCase(persons, points, { generate: () => 'entry-1' });

    const result = await useCase.execute({ personId: 'p1', points: 100, reason: 'Birthday bonus' });

    expect(result).toEqual({ personId: 'p1', type: 'earned', points: 100, balance: 100 });
    expect((await persons.findById('p1'))?.pointsBalance).toBe(100);
    const [entry] = await points.findByPersonId('p1');
    expect(entry?.type).toBe('earned');
    expect(entry?.balanceAfter).toBe(100);
    expect(entry?.reason).toBe('Birthday bonus');
  });

  it('throws NotFoundError for a missing person', async () => {
    const useCase = new AddPointsUseCase(new FakePersonRepository(), new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ personId: 'missing', points: 10 }),
    ).rejects.toThrow('was not found');
  });

  it('propagates ValidationError for invalid points', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada' }));
    const useCase = new AddPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(useCase.execute({ personId: 'p1', points: 0 })).rejects.toThrow(ValidationError);
  });
});

describe('RemovePointsUseCase', () => {
  it('removes points and records a removed entry', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada' }).addPoints(100));
    const useCase = new RemovePointsUseCase(persons, points, { generate: () => 'entry-2' });

    const result = await useCase.execute({ personId: 'p1', points: 40 });

    expect(result).toEqual({ personId: 'p1', type: 'removed', points: 40, balance: 60 });
    const [entry] = await points.findByPersonId('p1');
    expect(entry?.type).toBe('removed');
  });

  it('throws ValidationError when points exceed the balance', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada' }).addPoints(10));
    const useCase = new RemovePointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ personId: 'p1', points: 11 }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('RedeemPointsUseCase', () => {
  it('redeems points and records a redeemed entry', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada' }).addPoints(200));
    const useCase = new RedeemPointsUseCase(persons, points, { generate: () => 'entry-3' });

    const result = await useCase.execute({ personId: 'p1', points: 75 });

    expect(result).toEqual({ personId: 'p1', type: 'redeemed', points: 75, balance: 125 });
    const [entry] = await points.findByPersonId('p1');
    expect(entry?.type).toBe('redeemed');
    expect(entry?.balanceAfter).toBe(125);
  });

  it('throws ValidationError when redeeming more than the balance', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada' }).addPoints(5));
    const useCase = new RedeemPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(useCase.execute({ personId: 'p1', points: 6 })).rejects.toThrow(ValidationError);
  });
});