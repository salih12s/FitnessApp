export interface PublicUser {
  id: string;
  username: string;
  createdAt: Date;
}

export interface UserCredentials extends PublicUser {
  passwordHash: string;
}
