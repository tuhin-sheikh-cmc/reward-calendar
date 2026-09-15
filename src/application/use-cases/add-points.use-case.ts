import { Person } from '../../domain/entities/person.js';
import { PointsEntryType } from '../../domain/entities/points-entry.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';
import { IdGenerator } from '../../domain/services/id-generator.js';
import { GrantPointsPolicy } from '../../domain/services/grant-points-policy.js';
import { GrantPointsInput } from '../dtos/points.dtos.js';
import { AdjustPointsUseCase, PointsAdjustmentResult } from './adjust-points.use-case.js';

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

  public override async execute(input: GrantPointsInput): Promise<PointsAdjustmentResult> {
    const receiver = await this.findOrThrow(input.personId);
    const provider = await this.findOrThrow(input.providerId, 'Provider');
    GrantPointsPolicy.assertCanGrant(provider, receiver);
    return this.persistAdjustment(receiver, input.points, input.reason);
  }
}