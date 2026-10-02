import {
  ErrorResponse,
  ListPersonsResponse,
  ListPointsEntriesResponse,
  LoginResponse,
  Person,
  PointsAdjustmentResponse,
  SessionInfo,
} from './types.js';

const TOKEN_KEY = 'puroshkar.token';
const SESSION_KEY = 'puroshkar.session';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getSession(): SessionInfo | null {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SessionInfo>;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string' &&
      (parsed.role === 'provider' || parsed.role === 'receiver')
    ) {
      return { id: parsed.id, name: parsed.name, email: parsed.email, role: parsed.role };
    }
  } catch {
    // Corrupted session payload; treat as signed out.
  }
  return null;
}

export function storeToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function storeSession(person: Person): void {
  const session: SessionInfo = {
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
  };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;
  try {
    const body = (await response.json()) as Partial<ErrorResponse>;
    if (typeof body.message === 'string' && body.message.length > 0) {
      message = body.message;
    }
  } catch {
    // Response was not JSON; keep the status based message.
  }
  return new ApiError(message, response.status);
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(path, { ...init, headers });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const body = (await response.json()) as LoginResponse;
  storeToken(body.token);
  storeSession(body.person);
  return body;
}

export async function fetchReceivers(): Promise<Person[]> {
  const response = await request('/api/v1/persons');
  if (!response.ok) {
    throw await toApiError(response);
  }
  const body = (await response.json()) as ListPersonsResponse;
  return body.persons.filter(
    (person) => person.role === 'receiver' && person.isActive,
  );
}

export async function fetchPerson(personId: string): Promise<Person> {
  const response = await request(`/api/v1/persons/${encodeURIComponent(personId)}`);
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as Person;
}

export async function fetchPointsEntries(
  personId: string,
  limit: number,
  offset: number,
): Promise<ListPointsEntriesResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await request(
    `/api/v1/persons/${encodeURIComponent(personId)}/points?${params.toString()}`,
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as ListPointsEntriesResponse;
}

export async function addPoints(
  personId: string,
  points: number,
  reason?: string,
): Promise<PointsAdjustmentResponse> {
  const response = await request('/api/v1/points/add', {
    method: 'POST',
    body: JSON.stringify({
      personId,
      points,
      ...(reason !== undefined && reason.length > 0 ? { reason } : {}),
    }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as PointsAdjustmentResponse;
}

export async function removePoints(
  personId: string,
  points: number,
  reason?: string,
): Promise<PointsAdjustmentResponse> {
  const response = await request('/api/v1/points/remove', {
    method: 'POST',
    body: JSON.stringify({
      personId,
      points,
      ...(reason !== undefined && reason.length > 0 ? { reason } : {}),
    }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as PointsAdjustmentResponse;
}
