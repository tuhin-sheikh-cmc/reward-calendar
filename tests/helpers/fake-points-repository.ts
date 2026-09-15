import { PointsEntry } from '../../src/domain/entities/points-entry.js';
import { PointsRepository } from '../../src/domain/repositories/points-repository.js';

export class FakePointsRepository implements PointsRepository {
  private readonly entries = new Map<string, PointsEntry>();

  public async record(entry: PointsEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  public async findByPersonId(personId: string): Promise<PointsEntry[]> {
    return [...this.entries.values()].filter((entry) => entry.personId === personId);
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