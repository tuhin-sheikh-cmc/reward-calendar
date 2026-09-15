import { PointsEntry } from '../entities/points-entry.js';

export interface PointsRepository {
  record(entry: PointsEntry): Promise<void>;
  findByPersonId(personId: string): Promise<PointsEntry[]>;
  removeByPersonId(personId: string): Promise<void>;
  clear(): Promise<void>;
}