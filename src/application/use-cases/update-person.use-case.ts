import { ConflictError, NotFoundError } from '../../domain/errors/domain-error.js';
import { PasswordHasher } from '../../domain/services/password-hasher.js';
import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { UpdatePersonInput } from '../dtos/person.dtos.js';

export class UpdatePersonUseCase {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(input: UpdatePersonInput): Promise<Person> {
    const person = await this.personRepository.findById(input.id);
    if (!person) {
      throw new NotFoundError(`Person with id "${input.id}" was not found`);
    }

    const email = input.email?.trim().toLowerCase();
    if (email !== undefined && email !== person.email) {
      const existing = await this.personRepository.findByEmail(email);
      if (existing) {
        throw new ConflictError(`A person with email "${email}" already exists`);
      }
    }

    const passwordHash =
      input.password !== undefined ? await this.passwordHasher.hash(input.password) : undefined;

    const updated = person.update({
      name: input.name,
      ...(email !== undefined ? { email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
    });
    await this.personRepository.save(updated);
    return updated;
  }
}
