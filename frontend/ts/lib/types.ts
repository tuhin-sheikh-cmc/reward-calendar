export type PersonRole = 'provider' | 'receiver';

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  email?: string;
  isActive: boolean;
  pointsBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListPersonsResponse {
  persons: Person[];
  appVersion: string;
  timestamp: number;
}