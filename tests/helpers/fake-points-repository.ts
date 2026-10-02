import { PointsEntry } from '../../src/domain/entities/points-entry.js';
import { PointsRepository, PointsPage } from '../../src/domain/repositories/points-repository.js';

export class FakePointsRepository implements PointsRepository {
  private readonly entries = new Map<string, PointsEntry>();

  public async record(entry: PointsEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  public async findByPersonId(personId: string): Promise<PointsEntry[]> {
    return [...this.entries.values()].filter((entry) => entry.personId === personId);
  }

  public async findPageByPersonId(
    personId: string,
    options: { limit: number; offset: number },
  ): Promise<PointsPage> {
    const matching = [...this.entries.values()]
      .filter((entry) => entry.personId === personId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return {
      entries: matching.slice(options.offset, options.offset + options.limit),
      total: matching.length,
    };
  }

  public async removeByPersonId(personId: string): Promise<void> {
    for (const [id, entry] of this.entries) {
      if (entry.personId === personId) {
        this.entries.delete(id);
      }
    }
  }

  public async clear(): Promise<void> {
    this.entries.clear();
  }
}