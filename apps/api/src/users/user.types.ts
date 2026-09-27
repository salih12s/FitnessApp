export interface PublicUser {
  id: string;
  username: string;
  weightUnit: 'kg' | 'lb';
  isCoach: boolean;
  createdAt: Date;
}

export interface UserCredentials extends PublicUser {
  passwordHash: string;
}
