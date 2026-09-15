import { NotFoundError } from '../../domain/errors/domain-error.js';
import { Person } from '../../domain/entities/person.js';
import { PointsEntry } from '../../domain/entities/points-entry.js';
import { PointsEntryType } from '../../domain/entities/points-entry.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';
import { IdGenerator } from '../../domain/services/id-generator.js';
import { AdjustPointsInput } from '../dtos/points.dtos.js';

export interface PointsAdjustmentResult {
  personId: string;
  type: PointsEntryType;
  points: number;
  balance: number;
}

export abstract class AdjustPointsUseCase {
  protected constructor(
    private readonly personRepository: PersonRepository,
    private readonly pointsRepository: PointsRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  protected abstract readonly type: PointsEntryType;

  protected abstract apply(person: Person, points: number): Person;

  public async execute(input: AdjustPointsInput): Promise<PointsAdjustmentResult> {
    const person = await this.personRepository.findById(input.personId);
    if (!person) {
      throw new NotFoundError(`Person with id "${input.personId}" was not found`);
    }

    const adjusted = this.apply(person, input.points);
    await this.personRepository.save(adjusted);

    const entry = PointsEntry.create({
      id: this.idGenerator.generate(),
      personId: person.id,
      type: this.type,
      points: input.points,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      balanceAfter: adjusted.pointsBalance,
    });
    await this.pointsRepository.record(entry);

    return {
      personId: person.id,
      type: this.type,
      points: input.points,
      balance: adjusted.pointsBalance,
    };
  }
}