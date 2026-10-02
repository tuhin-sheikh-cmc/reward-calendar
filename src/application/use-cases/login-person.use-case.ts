import { ForbiddenError, UnauthorizedError } from '../../domain/errors/domain-error.js';
import { PasswordHasher } from '../../domain/services/password-hasher.js';
import { Person } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { LoginPersonInput } from '../dtos/auth.dtos.js';

const INVALID_CREDENTIALS = 'Invalid email or password';

export class LoginPersonUseCase {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(input: LoginPersonInput): Promise<Person> {
    const email = input.email.trim().toLowerCase();
    const person = await this.personRepository.findByEmail(email);
    if (!person) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, person.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    if (!person.isActive) {
      throw new ForbiddenError(`Person "${person.id}" is not active`);
    }

    return person;
  }
}
