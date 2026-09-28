export interface PublicUser {
  id: string;
  username: string;
  weightUnit: 'kg' | 'lb';
  isCoach: boolean;
  isDemo: boolean;
  createdAt: Date;
}

export interface UserCredentials extends PublicUser {
  passwordHash: string;
}
