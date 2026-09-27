export interface CoachStatus {
  isCoach: boolean;
  inviteCode: string | null;
}

/** A coach or client on the other side of a link. */
export interface LinkedAccount {
  id: string;
  username: string;
  linkedAt: string;
}

export interface ClientSummary extends LinkedAccount {
  lastActivityAt: string | null;
  last7Days: { trainingDays: number; setCount: number; volumeKg: string };
}

export interface InvitePreview {
  coach: { id: string; username: string };
  alreadyLinked: boolean;
}
