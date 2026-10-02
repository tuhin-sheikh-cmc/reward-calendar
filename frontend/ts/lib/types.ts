export type PersonRole = 'provider' | 'receiver';

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  email: string;
  isActive: boolean;
  pointsBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  name: string;
  role: PersonRole;
  email: string;
}

export interface ListPersonsResponse {
  persons: Person[];
  appVersion: string;
  timestamp: number;
}

export type PointsAdjustmentType = 'earned' | 'removed' | 'redeemed';

export interface PointsEntry {
  id: string;
  personId: string;
  type: PointsAdjustmentType;
  points: number;
  reason?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface ListPointsEntriesResponse {
  personId: string;
  entries: PointsEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  appVersion: string;
  timestamp: number;
}

export interface PointsAdjustmentResponse {
  personId: string;
  type: PointsAdjustmentType;
  points: number;
  balance: number;
  appVersion: string;
  timestamp: number;
}

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number;
  person: Person;
  appVersion: string;
  timestamp: number;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}
