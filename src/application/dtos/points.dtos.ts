export interface AdjustPointsInput {
  personId: string;
  points: number;
  reason?: string;
}

export interface GrantPointsInput {
  providerId: string;
  personId: string;
  points: number;
  reason?: string;
}