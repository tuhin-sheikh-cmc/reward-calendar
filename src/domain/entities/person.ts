import { ValidationError } from '../errors/domain-error.js';

export type PersonRole = 'provider' | 'receiver';

export interface PersonProperties {
  id: string;
  name: string;
  role: PersonRole;
  email: string;
  passwordHash: string;
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
    role: PersonRole;
    email: string;
    passwordHash: string;
  }): Person {
    Person.assertValidName(properties.name);
    Person.assertValidRole(properties.role);
    Person.assertValidEmail(properties.email);
    Person.assertPasswordHash(properties.passwordHash);
    const now = new Date();
    return new Person({
      id: properties.id,
      name: properties.name,
      role: properties.role,
      email: properties.email,
      passwordHash: properties.passwordHash,
      isActive: true,
      pointsBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
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

  public get role(): PersonRole {
    return this.properties.role;
  }

  public get email(): string {
    return this.properties.email;
  }

  public get passwordHash(): string {
    return this.properties.passwordHash;
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

  public update(properties: { name: string; email?: string; role?: PersonRole; passwordHash?: string }): Person {
    Person.assertValidName(properties.name);
    const next: PersonProperties = {
      ...this.properties,
      name: properties.name,
      updatedAt: new Date(),
    };
    if (properties.email !== undefined) {
      Person.assertValidEmail(properties.email);
      next.email = properties.email;
    }
    if (properties.role !== undefined) {
      Person.assertValidRole(properties.role);
      next.role = properties.role;
    }
    if (properties.passwordHash !== undefined) {
      Person.assertPasswordHash(properties.passwordHash);
      next.passwordHash = properties.passwordHash;
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

  private static assertValidRole(role: PersonRole): void {
    if (role !== 'provider' && role !== 'receiver') {
      throw new ValidationError('Person role must be either "provider" or "receiver"');
    }
  }

  private static assertValidEmail(email: string): void {
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new ValidationError('Person email is required to sign in');
    }
  }

  private static assertPasswordHash(passwordHash: string): void {
    if (typeof passwordHash !== 'string' || passwordHash.trim().length === 0) {
      throw new ValidationError('Person password hash is required');
    }
  }
}