export interface CreatePersonInput {
  name: string;
  email?: string;
}

export interface UpdatePersonInput {
  id: string;
  name: string;
  email?: string;
}