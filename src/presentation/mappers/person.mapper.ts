import { Person } from '../../domain/entities/person.js';
import { PersonItem } from '../schemas/person.schemas.js';

export function toPersonResponse(person: Person): PersonItem {
  const response: PersonItem = {
    id: person.id,
    name: person.name,
    role: person.role,
    isActive: person.isActive,
    pointsBalance: person.pointsBalance,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
  if (person.email !== undefined) {
    response.email = person.email;
  }
  return response;
}