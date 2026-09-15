import { describe, expect, it } from 'vitest';
import { CreatePersonUseCase } from '../../../src/application/use-cases/create-person.use-case.js';
import { GetPersonUseCase } from '../../../src/application/use-cases/get-person.use-case.js';
import { ListPersonsUseCase } from '../../../src/application/use-cases/list-persons.use-case.js';
import { RemovePersonUseCase } from '../../../src/application/use-cases/remove-person.use-case.js';
import { UpdatePersonUseCase } from '../../../src/application/use-cases/update-person.use-case.js';
import { Person } from '../../../src/domain/entities/person.js';
import { PointsEntry } from '../../../src/domain/entities/points-entry.js';
import { FakePersonRepository } from '../../helpers/fake-person-repository.js';
import { FakePointsRepository } from '../../helpers/fake-points-repository.js';

describe('CreatePersonUseCase', () => {
  it('creates and persists a person with zero balance', async () => {
    const repository = new FakePersonRepository();
    const useCase = new CreatePersonUseCase(repository, { generate: () => 'ppp-1' });

    const person = await useCase.execute({ name: 'Ada Lovelace', role: 'receiver' });

    expect(person.id).toBe('ppp-1');
    expect(person.name).toBe('Ada Lovelace');
    expect(person.role).toBe('receiver');
    expect(person.pointsBalance).toBe(0);
    await expect(repository.findById('ppp-1')).resolves.toBeInstanceOf(Person);
  });

  it('persists an optional email', async () => {
    const repository = new FakePersonRepository();
    const useCase = new CreatePersonUseCase(repository, { generate: () => 'ppp-2' });

    const person = await useCase.execute({
      name: 'Grace Hopper',
      role: 'provider',
      email: 'grace@example.com',
    });

    expect(person.email).toBe('grace@example.com');
    expect(person.role).toBe('provider');
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
    });
    await repository.seed(original);
    const useCase = new UpdatePersonUseCase(repository);

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

  it('throws NotFoundError for a missing person', async () => {
    const useCase = new UpdatePersonUseCase(new FakePersonRepository());

    await expect(useCase.execute({ id: 'missing', name: 'Nobody' })).rejects.toThrow('was not found');
  });
});

describe('RemovePersonUseCase', () => {
  it('removes the person and their point entries', async () => {
    const persons = new FakePersonRepository();
    const points = new FakePointsRepository();
    await persons.seed(Person.create({ id: 'ppp-1', name: 'Ada', role: 'receiver' }));
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
    await repository.seed(Person.create({ id: 'ppp-1', name: 'Ada', role: 'receiver' }));
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
    await repository.seed(Person.create({ id: 'p1', name: 'Ada', role: 'receiver' }));
    await repository.seed(Person.create({ id: 'p2', name: 'Grace', role: 'provider' }));

    const persons = await new ListPersonsUseCase(repository).execute();
    expect(persons).toHaveLength(2);
  });

  it('returns an empty list when none exist', async () => {
    const persons = await new ListPersonsUseCase(new FakePersonRepository()).execute();
    expect(persons).toEqual([]);
  });
});