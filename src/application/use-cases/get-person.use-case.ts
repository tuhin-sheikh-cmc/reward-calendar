import { NotFoundError } from '../../domain/errors/domain-error.js';
import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';

export class GetPersonUseCase {
  constructor(private readonly personRepository: PersonRepository) {}

  public async execute(id: string): Promise<Person> {
    const person = await this.personRepository.findById(id);
    if (!person) {
      throw new NotFoundError(`Person with id "${id}" was not found`);
    }
    return person;
  }
}