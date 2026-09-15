import { ListPersonsResponse, Person } from './types.js';

export async function fetchReceivers(): Promise<Person[]> {
  const response = await fetch('/api/v1/persons', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const body = (await response.json()) as ListPersonsResponse;
  return body.persons.filter(
    (person) => person.role === 'receiver' && person.isActive,
  );
}