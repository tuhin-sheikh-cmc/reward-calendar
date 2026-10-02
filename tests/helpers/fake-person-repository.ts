import { Person } from '../../src/domain/entities/person.js';
import { PersonRepository } from '../../src/domain/repositories/person-repository.js';

export class FakePersonRepository implements PersonRepository {
  private readonly persons = new Map<string, Person>();

  public async save(person: Person): Promise<void> {
    this.persons.set(person.id, person);
  }

  public async findById(id: string): Promise<Person | null> {
    return this.persons.get(id) ?? null;
  }

  public async findByEmail(email: string): Promise<Person | null> {
    for (const person of this.persons.values()) {
      if (person.email === email) {
        return person;
      }
    }
    return null;
  }

  public async findAll(): Promise<Person[]> {
    return [...this.persons.values()];
  }

  public async remove(id: string): Promise<void> {
    this.persons.delete(id);
  }

  public async seed(person: Person): Promise<void> {
    this.persons.set(person.id, person);
  }

  public async clear(): Promise<void> {
    this.persons.clear();
  }
}
