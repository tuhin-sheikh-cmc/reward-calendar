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
    const person = await this.findOrThrow(input.personId);
    return this.persistAdjustment(person, input.points, input.reason);
  }

  protected async findOrThrow(personId: string, description = 'Person'): Promise<Person> {
    const person = await this.personRepository.findById(personId);
    if (!person) {
      throw new NotFoundError(`${description} with id "${personId}" was not found`);
    }
    return person;
  }

  protected async persistAdjustment(
    person: Person,
    points: number,
    reason?: string,
  ): Promise<PointsAdjustmentResult> {
    const adjusted = this.apply(person, points);
    await this.personRepository.save(adjusted);

    const entry = PointsEntry.create({
      id: this.idGenerator.generate(),
      personId: person.id,
      type: this.type,
      points,
      ...(reason !== undefined ? { reason } : {}),
      balanceAfter: adjusted.pointsBalance,
    });
    await this.pointsRepository.record(entry);

    return {
      personId: person.id,
      type: this.type,
      points,
      balance: adjusted.pointsBalance,
    };
  }
}