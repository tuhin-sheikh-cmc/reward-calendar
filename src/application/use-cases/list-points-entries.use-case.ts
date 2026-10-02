import { NotFoundError } from '../../domain/errors/domain-error.js';
import { PointsEntry } from '../../domain/entities/points-entry.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';

export interface ListPointsEntriesInput {
  personId: string;
  limit: number;
  offset: number;
}

export interface ListPointsEntriesResult {
  personId: string;
  entries: PointsEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class ListPointsEntriesUseCase {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly pointsRepository: PointsRepository,
  ) {}

  public async execute(input: ListPointsEntriesInput): Promise<ListPointsEntriesResult> {
    const person = await this.personRepository.findById(input.personId);
    if (!person) {
      throw new NotFoundError(`Person with id "${input.personId}" was not found`);
    }

    const page = await this.pointsRepository.findPageByPersonId(input.personId, {
      limit: input.limit,
      offset: input.offset,
    });

    return {
      personId: input.personId,
      entries: page.entries,
      total: page.total,
      limit: input.limit,
      offset: input.offset,
      hasMore: input.offset + page.entries.length < page.total,
    };
  }
}
