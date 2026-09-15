import { NotFoundError } from '../../domain/errors/domain-error.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';

export class RemovePersonUseCase {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly pointsRepository: PointsRepository,
  ) {}

  public async execute(id: string): Promise<void> {
    const person = await this.personRepository.findById(id);
    if (!person) {
      throw new NotFoundError(`Person with id "${id}" was not found`);
    }
    await this.personRepository.remove(id);
    await this.pointsRepository.removeByPersonId(id);
  }
}