import { randomUUID } from 'node:crypto';
import { IdGenerator } from '../../domain/services/id-generator.js';

export class UuidIdGenerator implements IdGenerator {
  public generate(): string {
    return randomUUID();
  }
}