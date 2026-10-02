import { PasswordHasher } from '../../src/domain/services/password-hasher.js';

export class FakePasswordHasher implements PasswordHasher {
  public readonly hashed: string[] = [];

  public async hash(plainPassword: string): Promise<string> {
    this.hashed.push(plainPassword);
    return `hashed:${plainPassword}`;
  }

  public async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}
