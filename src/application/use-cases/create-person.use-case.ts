import { IdGenerator } from '../../domain/services/id-generator.js';
import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { CreatePersonInput } from '../dtos/person.dtos.js';

export class CreatePersonUseCase {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  public async execute(input: CreatePersonInput): Promise<Person> {
    const person = Person.create({
      id: this.idGenerator.generate(),
      name: input.name,
      ...(input.email !== undefined ? { email: input.email } : {}),
    });
    await this.personRepository.save(person);
    return person;
  }
}