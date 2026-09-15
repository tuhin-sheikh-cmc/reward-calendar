import { Person } from '../../domain/entities/person.js';
import { PointsEntryType } from '../../domain/entities/points-entry.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';
import { IdGenerator } from '../../domain/services/id-generator.js';
import { AdjustPointsUseCase } from './adjust-points.use-case.js';

export class AddPointsUseCase extends AdjustPointsUseCase {
  protected readonly type: PointsEntryType = 'earned';

  constructor(
    personRepository: PersonRepository,
    pointsRepository: PointsRepository,
    idGenerator: IdGenerator,
  ) {
    super(personRepository, pointsRepository, idGenerator);
  }

  protected apply(person: Person, points: number): Person {
    return person.addPoints(points);
  }
}