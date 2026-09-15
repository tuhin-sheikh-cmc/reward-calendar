import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';

export class ListPersonsUseCase {
  constructor(private readonly personRepository: PersonRepository) {}

  public async execute(onlyActive = false): Promise<Person[]> {
    const persons = await this.personRepository.findAll();
    return onlyActive ? persons.filter((person) => person.isActive) : persons;
  }
}