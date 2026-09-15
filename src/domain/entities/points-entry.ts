import { ValidationError } from '../errors/domain-error.js';

export type PointsEntryType = 'earned' | 'removed' | 'redeemed';

export interface PointsEntryProperties {
  id: string;
  personId: string;
  type: PointsEntryType;
  points: number;
  reason?: string;
  balanceAfter: number;
  createdAt: Date;
}

export class PointsEntry {
  private constructor(private readonly properties: PointsEntryProperties) {}

  public static create(properties: {
    id: string;
    personId: string;
    type: PointsEntryType;
    points: number;
    reason?: string;
    balanceAfter: number;
  }): PointsEntry {
    if (!Number.isInteger(properties.points) || properties.points <= 0) {
      throw new ValidationError('Points must be a positive integer');
    }
    if (!Number.isInteger(properties.balanceAfter) || properties.balanceAfter < 0) {
      throw new ValidationError('Balance after adjustment must be a non-negative integer');
    }
    const snapshot: PointsEntryProperties = {
      id: properties.id,
      personId: properties.personId,
      type: properties.type,
      points: properties.points,
      balanceAfter: properties.balanceAfter,
      createdAt: new Date(),
    };
    if (properties.reason !== undefined && properties.reason !== '') {
      snapshot.reason = properties.reason;
    }
    return new PointsEntry(snapshot);
  }

  public static fromSnapshot(properties: PointsEntryProperties): PointsEntry {
    return new PointsEntry(properties);
  }

  public get id(): string {
    return this.properties.id;
  }

  public get personId(): string {
    return this.properties.personId;
  }

  public get type(): PointsEntryType {
    return this.properties.type;
  }

  public get points(): number {
    return this.properties.points;
  }

  public get reason(): string | undefined {
    return this.properties.reason;
  }

  public get balanceAfter(): number {
    return this.properties.balanceAfter;
  }

  public get createdAt(): Date {
    return this.properties.createdAt;
  }
}