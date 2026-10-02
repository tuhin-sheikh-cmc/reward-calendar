import { PointsEntry } from '../../domain/entities/points-entry.js';
import { PointsEntryItem } from '../schemas/points.schemas.js';

export function toPointsEntryResponse(entry: PointsEntry): PointsEntryItem {
  return {
    id: entry.id,
    personId: entry.personId,
    type: entry.type,
    points: entry.points,
    balanceAfter: entry.balanceAfter,
    createdAt: entry.createdAt.toISOString(),
    ...(entry.reason !== undefined ? { reason: entry.reason } : {}),
  };
}
