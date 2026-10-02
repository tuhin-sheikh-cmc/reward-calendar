import { PersonRole } from '../../domain/entities/person.js';

export interface CreatePersonInput {
  name: string;
  role: PersonRole;
  email: string;
  password: string;
}

export interface UpdatePersonInput {
  id: string;
  name: string;
  role?: PersonRole;
  email?: string;
  password?: string;
}
