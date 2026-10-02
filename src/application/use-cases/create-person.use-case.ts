import { IdGenerator } from '../../domain/services/id-generator.js';
import { PasswordHasher } from '../../domain/services/password-hasher.js';
import { ConflictError } from '../../domain/errors/domain-error.js';
import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { CreatePersonInput } from '../dtos/person.dtos.js';

export class CreatePersonUseCase {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly idGenerator: IdGenerator,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(input: CreatePersonInput): Promise<Person> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.personRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError(`A person with email "${email}" already exists`);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const person = Person.create({
      id: this.idGenerator.generate(),
      name: input.name,
      role: input.role,
      email,
      passwordHash,
    });
    await this.personRepository.save(person);
    return person;
  }
}
