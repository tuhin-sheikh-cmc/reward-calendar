import { describe, expect, it } from 'vitest';
import { CreatePersonUseCase } from '../../../src/application/use-cases/create-person.use-case.js';
import { GetPersonUseCase } from '../../../src/application/use-cases/get-person.use-case.js';
import { ListPersonsUseCase } from '../../../src/application/use-cases/list-persons.use-case.js';
import { LoginPersonUseCase } from '../../../src/application/use-cases/login-person.use-case.js';
import { RemovePersonUseCase } from '../../../src/application/use-cases/remove-person.use-case.js';
import { UpdatePersonUseCase } from '../../../src/application/use-cases/update-person.use-case.js';
import { Person } from '../../../src/domain/entities/person.js';
import { PointsEntry } from '../../../src/domain/entities/points-entry.js';
import { FakePasswordHasher } from '../../helpers/fake-password-hasher.js';
import { FakePersonRepository } from '../../helpers/fake-person-repository.js';
import { FakePointsRepository } from '../../helpers/fake-points-repository.js';

function seededPerson(overrides: {
  id: string;
  name?: string;
  role?: 'provider' | 'receiver';
  email?: string;
  isActive?: boolean;
}): Person {
  return Person.create({
    id: overrides.id,
    name: overrides.name ?? 'Ada',
    role: overrides.role ?? 'receiver',
    email: overrides.email ?? `${overrides.id}@example.com`,
    passwordHash: 'hashed:secret',
    ...(overrides.isActive === undefined ? {} : { isActive: overrides.isActive }),
  });
}

describe('CreatePersonUseCase', () => {
  it('creates and persists a person with zero balance', async () => {
    const repository = new FakePersonRepository();
    const hasher = new FakePasswordHasher();
    const useCase = new CreatePersonUseCase(
      repository,
      { generate: () => 'ppp-1' },
      hasher,
    );

    const person = await useCase.execute({
      name: 'Ada Lovelace',
      role: 'receiver',
      email: 'ada@example.com',
      password: 'a-strong-password',
    });

    expect(person.id).toBe('ppp-1');
    expect(person.name).toBe('Ada Lovelace');
    expect(person.role).toBe('receiver');
    expect(person.pointsBalance).toBe(0);
    await expect(repository.findById('ppp-1')).resolves.toBeInstanceOf(Person);
  });

  it('normalizes the email and never stores the plain password', async () => {
    const repository = new FakePersonRepository();
    const hasher = new FakePasswordHasher();
    const useCase = new CreatePersonUseCase(repository, { generate: () => 'ppp-2' }, hasher);

    const person = await useCase.execute({
      name: 'Grace Hopper',
      role: 'provider',
      email: '  Grace@Example.COM ',
      password: 'another-strong-password',
    });

    expect(person.email).toBe('grace@example.com');
    expect(person.passwordHash).toBe('hashed:another-strong-password');
    expect(hasher.hashed).toEqual(['another-strong-password']);
    await expect(repository.findByEmail('grace@example.com')).resolves.toBe(person);
  });

  it('rejects a duplicate email with ConflictError', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-existing', email: 'ada@example.com' }));
    const useCase = new CreatePersonUseCase(
      repository,
      { generate: () => 'ppp-3' },
      new FakePasswordHasher(),
    );

    await expect(
      useCase.execute({
        name: 'Ada Again',
        role: 'receiver',
        email: 'ADA@example.com',
        password: 'a-strong-password',
      }),
    ).rejects.toThrow('already exists');
  });
});

describe('UpdatePersonUseCase', () => {
  it('updates an existing person', async () => {
    const repository = new FakePersonRepository();
    const original = Person.create({
      id: 'ppp-1',
      name: 'Old name',
      role: 'receiver',
      email: 'old@example.com',
      passwordHash: 'hashed:secret',
    });
    await repository.seed(original);
    const useCase = new UpdatePersonUseCase(repository, new FakePasswordHasher());

    const updated = await useCase.execute({
      id: 'ppp-1',
      name: 'New name',
      role: 'provider',
      email: 'new@example.com',
    });

    expect(updated.name).toBe('New name');
    expect(updated.email).toBe('new@example.com');
    expect(updated.role).toBe('provider');
    expect(updated.pointsBalance).toBe(original.pointsBalance);
  });

  it('hashes a new password when one is supplied', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1' }));
    const useCase = new UpdatePersonUseCase(repository, new FakePasswordHasher());

    const updated = await useCase.execute({ id: 'ppp-1', name: 'Ada', password: 'rotated-password' });

    expect(updated.passwordHash).toBe('hashed:rotated-password');
  });

  it('keeps the password hash when no password is supplied', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1' }));
    const useCase = new UpdatePersonUseCase(repository, new FakePasswordHasher());

    const updated = await useCase.execute({ id: 'ppp-1', name: 'Ada G.' });

    expect(updated.passwordHash).toBe('hashed:secret');
  });

  it('allows re-submitting the same email', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1', email: 'ada@example.com' }));
    const useCase = new UpdatePersonUseCase(repository, new FakePasswordHasher());

    const updated = await useCase.execute({
      id: 'ppp-1',
      name: 'Ada G.',
      email: 'ADA@Example.com',
    });

    expect(updated.email).toBe('ada@example.com');
  });

  it('rejects an email already taken by another person', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1', email: 'ada@example.com' }));
    await repository.seed(seededPerson({ id: 'ppp-2', email: 'grace@example.com' }));
    const useCase = new UpdatePersonUseCase(repository, new FakePasswordHasher());

    await expect(
      useCase.execute({ id: 'ppp-1', name: 'Ada', email: 'grace@example.com' }),
    ).rejects.toThrow('already exists');
  });

  it('throws NotFoundError for a missing person', async () => {
    const useCase = new UpdatePersonUseCase(new FakePersonRepository(), new FakePasswordHasher());

    await expect(useCase.execute({ id: 'missing', name: 'Nobody' })).rejects.toThrow('was not found');
  });
});

describe('LoginPersonUseCase', () => {
  it('returns the person for valid credentials', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1', email: 'ada@example.com' }));
    const useCase = new LoginPersonUseCase(repository, new FakePasswordHasher());

    const person = await useCase.execute({ email: '  ADA@example.com', password: 'secret' });

    expect(person.id).toBe('ppp-1');
  });

  it('rejects an unknown email with UnauthorizedError', async () => {
    const useCase = new LoginPersonUseCase(new FakePersonRepository(), new FakePasswordHasher());

    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'secret' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects a wrong password with UnauthorizedError', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1', email: 'ada@example.com' }));
    const useCase = new LoginPersonUseCase(repository, new FakePasswordHasher());

    await expect(useCase.execute({ email: 'ada@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('rejects an inactive person with ForbiddenError', async () => {
    const repository = new FakePersonRepository();
    const inactive = seededPerson({ id: 'ppp-1', email: 'ada@example.com' }).deactivate();
    await repository.seed(inactive);
    const useCase = new LoginPersonUseCase(repository, new FakePasswordHasher());

    await expect(useCase.execute({ email: 'ada@example.com', password: 'secret' })).rejects.toThrow(
      'is not active',
    );
  });
});

describe('RemovePersonUseCase', () => {
  it('removes the person and their point entries', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(seededPerson({ id: 'ppp-1' }));
    await points.record(
      PointsEntry.create({
        id: 'entry-1',
        personId: 'ppp-1',
        type: 'earned',
        points: 5,
        balanceAfter: 5,
      }),
    );
    const useCase = new RemovePersonUseCase(persons, points);

    await useCase.execute('ppp-1');

    await expect(persons.findById('ppp-1')).resolves.toBeNull();
    await expect(points.findByPersonId('ppp-1')).resolves.toEqual([]);
  });

  it('throws NotFoundError for a missing person', async () => {
    const useCase = new RemovePersonUseCase(new FakePersonRepository(), new FakePointsRepository());

    await expect(useCase.execute('missing')).rejects.toThrow('was not found');
  });
});

describe('GetPersonUseCase', () => {
  it('returns the stored person', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'ppp-1' }));
    const useCase = new GetPersonUseCase(repository);

    const person = await useCase.execute('ppp-1');
    expect(person.name).toBe('Ada');
  });

  it('throws NotFoundError for a missing person', async () => {
    const useCase = new GetPersonUseCase(new FakePersonRepository());

    await expect(useCase.execute('missing')).rejects.toThrow('was not found');
  });
});

describe('ListPersonsUseCase', () => {
  it('lists all persons', async () => {
    const repository = new FakePersonRepository();
    await repository.seed(seededPerson({ id: 'p1' }));
    await repository.seed(seededPerson({ id: 'p2', name: 'Grace', role: 'provider' }));

    const persons = await new ListPersonsUseCase(repository).execute();
    expect(persons).toHaveLength(2);
  });

  it('returns an empty list when none exist', async () => {
    const persons = await new ListPersonsUseCase(new FakePersonRepository()).execute();
    expect(persons).toEqual([]);
  });
});
