import { Person } from '../../domain/entities/person.js';
import { PersonItem } from '../schemas/person.schemas.js';

export function toPersonResponse(person: Person): PersonItem {
  return {
    id: person.id,
    name: person.name,
    role: person.role,
    email: person.email,
    isActive: person.isActive,
    pointsBalance: person.pointsBalance,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}