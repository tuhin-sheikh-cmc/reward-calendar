import { ValidationError } from '../errors/domain-error.js';

export interface PersonProperties {
  id: string;
  name: string;
  email?: string;
  isActive: boolean;
  pointsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Person {
  private constructor(private readonly properties: PersonProperties) {}

  public static create(properties: {
    id: string;
    name: string;
    email?: string;
  }): Person {
    Person.assertValidName(properties.name);
    const now = new Date();
    const snapshot: PersonProperties = {
      id: properties.id,
      name: properties.name,
      isActive: true,
      pointsBalance: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (properties.email !== undefined && properties.email.trim() !== '') {
      snapshot.email = properties.email;
    }
    return new Person(snapshot);
  }

  public static fromSnapshot(properties: PersonProperties): Person {
    return new Person(properties);
  }

  public get id(): string {
    return this.properties.id;
  }

  public get name(): string {
    return this.properties.name;
  }

  public get email(): string | undefined {
    return this.properties.email;
  }

  public get isActive(): boolean {
    return this.properties.isActive;
  }

  public get pointsBalance(): number {
    return this.properties.pointsBalance;
  }

  public get createdAt(): Date {
    return this.properties.createdAt;
  }

  public get updatedAt(): Date {
    return this.properties.updatedAt;
  }

  public update(properties: { name: string; email?: string }): Person {
    Person.assertValidName(properties.name);
    const next: PersonProperties = {
      ...this.properties,
      name: properties.name,
      updatedAt: new Date(),
    };
    if (properties.email !== undefined && properties.email.trim() !== '') {
      next.email = properties.email;
    } else {
      delete next.email;
    }
    return new Person(next);
  }

  public deactivate(): Person {
    return new Person({ ...this.properties, isActive: false, updatedAt: new Date() });
  }

  public addPoints(points: number): Person {
    if (!Number.isInteger(points) || points <= 0) {
      throw new ValidationError('Points to add must be a positive integer');
    }
    return new Person({
      ...this.properties,
      pointsBalance: this.properties.pointsBalance + points,
      updatedAt: new Date(),
    });
  }

  public removePoints(points: number): Person {
    return this.deductPoints(points);
  }

  public redeemPoints(points: number): Person {
    return this.deductPoints(points);
  }

  private deductPoints(points: number): Person {
    if (!Number.isInteger(points) || points <= 0) {
      throw new ValidationError('Points must be a positive integer');
    }
    if (points > this.properties.pointsBalance) {
      throw new ValidationError(
        `Insufficient points balance: ${this.properties.pointsBalance} available, ${points} required`,
      );
    }
    return new Person({
      ...this.properties,
      pointsBalance: this.properties.pointsBalance - points,
      updatedAt: new Date(),
    });
  }

  private static assertValidName(name: string): void {
    if (name.trim().length === 0 || name.trim().length > 100) {
      throw new RangeError('Person name must be between 1 and 100 characters long');
    }
  }
}