import { PointsEntry } from '../entities/points-entry.js';

export interface PointsPage {
  entries: PointsEntry[];
  total: number;
}

export interface PointsRepository {
  record(entry: PointsEntry): Promise<void>;
  findByPersonId(personId: string): Promise<PointsEntry[]>;
  findPageByPersonId(
    personId: string,
    options: { limit: number; offset: number },
  ): Promise<PointsPage>;
  removeByPersonId(personId: string): Promise<void>;
  clear(): Promise<void>;
}
