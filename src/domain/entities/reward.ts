export type RewardType = 'percentage' | 'fixed';

export interface RewardProperties {
  id: string;
  name: string;
  type: RewardType;
  value: number;
  isActive: boolean;
  createdAt: Date;
}

export class Reward {
  private constructor(private readonly properties: RewardProperties) {}

  public static create(
    properties: Omit<RewardProperties, 'isActive' | 'createdAt'>,
  ): Reward {
    Reward.assertValidName(properties.name);
    Reward.assertValidValue(properties.value);
    return new Reward({
      ...properties,
      isActive: true,
      createdAt: new Date(),
    });
  }

  public static fromSnapshot(properties: RewardProperties): Reward {
    return new Reward(properties);
  }

  public get id(): string {
    return this.properties.id;
  }

  public get name(): string {
    return this.properties.name;
  }

  public get type(): RewardType {
    return this.properties.type;
  }

  public get value(): number {
    return this.properties.value;
  }

  public get isActive(): boolean {
    return this.properties.isActive;
  }

  public get createdAt(): Date {
    return this.properties.createdAt;
  }

  public deactivate(): Reward {
    return new Reward({ ...this.properties, isActive: false });
  }

  private static assertValidName(name: string): void {
    if (name.trim().length === 0 || name.trim().length > 100) {
      throw new RangeError('Reward name must be between 1 and 100 characters long');
    }
  }

  private static assertValidValue(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('Reward value must be a finite number greater than zero');
    }
  }
}