import { describe, expect, it } from 'vitest';
import { AddPointsUseCase } from '../../../src/application/use-cases/add-points.use-case.js';
import { RedeemPointsUseCase } from '../../../src/application/use-cases/redeem-points.use-case.js';
import { RemovePointsUseCase } from '../../../src/application/use-cases/remove-points.use-case.js';
import { Person } from '../../../src/domain/entities/person.js';
import { ForbiddenError } from '../../../src/domain/errors/domain-error.js';
import { ValidationError } from '../../../src/domain/errors/domain-error.js';
import { FakePersonRepository } from '../../helpers/fake-person-repository.js';
import { FakePointsRepository } from '../../helpers/fake-points-repository.js';

let emailCounter = 0;
function emailFor(): string {
  emailCounter += 1;
  return `member-${emailCounter}@example.com`;
}

describe('AddPointsUseCase', () => {
  it('adds points, saves the person and records an earned entry', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(Person.create({ id: 'provider1', name: 'Boss', role: 'provider',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    await persons.seed(Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    const useCase = new AddPointsUseCase(persons, points, { generate: () => 'entry-1' });

    const result = await useCase.execute({
      providerId: 'provider1',
      personId: 'p1',
      points: 100,
      reason: 'Birthday bonus',
    });

    expect(result).toEqual({ personId: 'p1', type: 'earned', points: 100, balance: 100 });
    expect((await persons.findById('p1'))?.pointsBalance).toBe(100);
    expect((await persons.findById('provider1'))?.pointsBalance).toBe(0);
    const [entry] = await points.findByPersonId('p1');
    expect(entry?.type).toBe('earned');
    expect(entry?.balanceAfter).toBe(100);
    expect(entry?.reason).toBe('Birthday bonus');
  });

  it('throws NotFoundError for a missing receiver', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'provider1', name: 'Boss', role: 'provider',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    const useCase = new AddPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ providerId: 'provider1', personId: 'missing', points: 10 }),
    ).rejects.toThrow('was not found');
  });

  it('throws NotFoundError for a missing provider', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    const useCase = new AddPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ providerId: 'missing-provider', personId: 'p1', points: 10 }),
    ).rejects.toThrow('Provider with id "missing-provider" was not found');
  });

  it('forbids granting points to oneself', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'p1', name: 'Ada', role: 'provider',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    const useCase = new AddPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ providerId: 'p1', personId: 'p1', points: 10 }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('forbids a receiver from granting points', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'receiver1', name: 'Fiona', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    await persons.seed(Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    const useCase = new AddPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ providerId: 'receiver1', personId: 'p1', points: 10 }),
    ).rejects.toThrow('Only providers can grant points');
  });

  it('propagates ValidationError for invalid points', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(Person.create({ id: 'provider1', name: 'Boss', role: 'provider',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    await persons.seed(Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }));
    const useCase = new AddPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(
      useCase.execute({ providerId: 'provider1', personId: 'p1', points: 0 }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('RemovePointsUseCase', () => {
  it('removes points and records a removed entry', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(
      Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }).addPoints(100),
    );
    const useCase = new RemovePointsUseCase(persons, points, { generate: () => 'entry-2' });

    const result = await useCase.execute({ personId: 'p1', points: 40 });

    expect(result).toEqual({ personId: 'p1', type: 'removed', points: 40, balance: 60 });
    const [entry] = await points.findByPersonId('p1');
    expect(entry?.type).toBe('removed');
  });

  it('throws ValidationError when points exceed the balance', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(
      Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }).addPoints(10),
    );
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
    await persons.seed(
      Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }).addPoints(200),
    );
    const useCase = new RedeemPointsUseCase(persons, points, { generate: () => 'entry-3' });

    const result = await useCase.execute({ personId: 'p1', points: 75 });

    expect(result).toEqual({ personId: 'p1', type: 'redeemed', points: 75, balance: 125 });
    const [entry] = await points.findByPersonId('p1');
    expect(entry?.type).toBe('redeemed');
    expect(entry?.balanceAfter).toBe(125);
  });

  it('throws ValidationError when redeeming more than the balance', async () => {
    const persons = new FakePersonRepository();
    await persons.seed(
      Person.create({ id: 'p1', name: 'Ada', role: 'receiver',
      email: emailFor(),
      passwordHash: 'hashed:secret',
    }).addPoints(5),
    );
    const useCase = new RedeemPointsUseCase(persons, new FakePointsRepository(), {
      generate: () => 'entry-x',
    });

    await expect(useCase.execute({ personId: 'p1', points: 6 })).rejects.toThrow(
      ValidationError,
    );
  });
});