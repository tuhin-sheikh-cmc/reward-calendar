import { Person } from '../entities/person.js';

export interface PersonRepository {
  save(person: Person): Promise<void>;
  findById(id: string): Promise<Person | null>;
  findAll(): Promise<Person[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}