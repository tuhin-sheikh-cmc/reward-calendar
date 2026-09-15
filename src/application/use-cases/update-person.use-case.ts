import { NotFoundError } from '../../domain/errors/domain-error.js';
import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { UpdatePersonInput } from '../dtos/person.dtos.js';

export class UpdatePersonUseCase {
  constructor(private readonly personRepository: PersonRepository) {}

  public async execute(input: UpdatePersonInput): Promise<Person> {
    const person = await this.personRepository.findById(input.id);
    if (!person) {
      throw new NotFoundError(`Person with id "${input.id}" was not found`);
    }
    const updated = person.update({
      name: input.name,
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
    });
    await this.personRepository.save(updated);
    return updated;
  }
}