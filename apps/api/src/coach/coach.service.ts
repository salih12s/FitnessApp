import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { localDayKey } from '../reports/reports.service.js';
import { formatCents, volumeCents } from '../reports/weight-math.js';

// No 0/O or 1/I so codes survive being read aloud or typed from a screen.
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_LENGTH = 8;
const INVITE_PATTERN = new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_LENGTH}}$`);
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CoachStatusResponse {
  isCoach: boolean;
  inviteCode: string | null;
}

export interface LinkedUserResponse {
  id: string;
  username: string;
  linkedAt: string;
}

export interface ClientSummaryResponse extends LinkedUserResponse {
  lastActivityAt: string | null;
  last7Days: { trainingDays: number; setCount: number; volumeKg: string };
}

export interface InvitePreviewResponse {
  coach: { id: string; username: string };
  alreadyLinked: boolean;
}

function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_LENGTH },
    () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)],
  ).join('');
}

/** Accepts codes typed in lowercase or with spaces and dashes. */
function normalizeInviteCode(code: string): string | null {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  return INVITE_PATTERN.test(normalized) ? normalized : null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function toLinkedUser(link: {
  createdAt: Date;
  user: { id: string; username: string };
}): LinkedUserResponse {
  return {
    id: link.user.id,
    username: link.user.username,
    linkedAt: link.createdAt.toISOString(),
  };
}

@Injectable()
export class CoachService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<CoachStatusResponse> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isCoach: true, coachInviteCode: true },
    });
    return { isCoach: user.isCoach, inviteCode: user.coachInviteCode };
  }

  /**
   * Turning coach mode on creates an invite code when there is none. Turning
   * it off removes every client link and the code, so no client stays
   * visible to an account that is no longer coaching.
   */
  async setEnabled(
    userId: string,
    enabled: boolean,
  ): Promise<CoachStatusResponse> {
    if (!enabled) {
      await this.prisma.client.$transaction([
        this.prisma.client.coachClient.deleteMany({
          where: { coachId: userId },
        }),
        this.prisma.client.user.update({
          where: { id: userId },
          data: { isCoach: false, coachInviteCode: null },
        }),
      ]);
      return { isCoach: false, inviteCode: null };
    }

    const status = await this.getStatus(userId);
    if (status.isCoach && status.inviteCode) return status;
    return this.saveInviteCode(userId, status.inviteCode);
  }

  async regenerateInviteCode(userId: string): Promise<CoachStatusResponse> {
    const status = await this.getStatus(userId);
    if (!status.isCoach) {
      throw new ForbiddenException('Coach mode is off.');
    }
    return this.saveInviteCode(userId, null);
  }

  async listClients(
    coachId: string,
    offsetMinutes: number,
  ): Promise<ClientSummaryResponse[]> {
    const links = await this.prisma.client.coachClient.findMany({
      where: { coachId },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        client: { select: { id: true, username: true } },
      },
    });
    const clientIds = links.map((link) => link.client.id);
    if (clientIds.length === 0) return [];

    const since = new Date(Date.now() - 7 * DAY_MS);
    const [lastActivity, recentLogs] = await Promise.all([
      this.prisma.client.exerciseLog.groupBy({
        by: ['userId'],
        where: { userId: { in: clientIds } },
        _max: { performedAt: true },
      }),
      this.prisma.client.exerciseLog.findMany({
        where: { userId: { in: clientIds }, performedAt: { gte: since } },
        select: {
          userId: true,
          performedAt: true,
          exerciseSets: { select: { weightKg: true, reps: true } },
        },
      }),
    ]);

    const lastByClient = new Map(
      lastActivity.map((row) => [row.userId, row._max.performedAt]),
    );

    const summaries = links.map((link): ClientSummaryResponse => {
      const logs = recentLogs.filter((log) => log.userId === link.client.id);
      const days = new Set(
        logs.map((log) =>
          localDayKey(log.performedAt.getTime(), offsetMinutes),
        ),
      );
      return {
        ...toLinkedUser({ createdAt: link.createdAt, user: link.client }),
        lastActivityAt: lastByClient.get(link.client.id)?.toISOString() ?? null,
        last7Days: {
          trainingDays: days.size,
          setCount: logs.reduce((sum, log) => sum + log.exerciseSets.length, 0),
          volumeKg: formatCents(
            logs.reduce((sum, log) => sum + volumeCents(log.exerciseSets), 0n),
          ),
        },
      };
    });

    // Most recently active first; clients without logs last.
    return summaries.sort((a, b) =>
      (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''),
    );
  }

  async getClient(
    coachId: string,
    clientId: string,
  ): Promise<LinkedUserResponse> {
    const link = await this.prisma.client.coachClient.findUnique({
      where: { coachId_clientId: { coachId, clientId } },
      select: {
        createdAt: true,
        client: { select: { id: true, username: true } },
      },
    });
    if (!link) throw new NotFoundException('Client was not found.');
    return toLinkedUser({ createdAt: link.createdAt, user: link.client });
  }

  async removeClient(coachId: string, clientId: string): Promise<void> {
    const result = await this.prisma.client.coachClient.deleteMany({
      where: { coachId, clientId },
    });
    if (result.count === 0)
      throw new NotFoundException('Client was not found.');
  }

  /** True when the user coaches the client through an existing link. */
  async isLinkedCoach(coachId: string, clientId: string): Promise<boolean> {
    const link = await this.prisma.client.coachClient.findFirst({
      where: { coachId, clientId, coach: { isCoach: true } },
      select: { id: true },
    });
    return link !== null;
  }

  async listCoaches(clientId: string): Promise<LinkedUserResponse[]> {
    const links = await this.prisma.client.coachClient.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        coach: { select: { id: true, username: true } },
      },
    });
    return links.map((link) =>
      toLinkedUser({ createdAt: link.createdAt, user: link.coach }),
    );
  }

  async previewInvite(
    userId: string,
    code: string,
  ): Promise<InvitePreviewResponse> {
    const coach = await this.findInviter(userId, code);
    const link = await this.prisma.client.coachClient.findUnique({
      where: { coachId_clientId: { coachId: coach.id, clientId: userId } },
      select: { id: true },
    });
    return { coach, alreadyLinked: link !== null };
  }

  /** Links the user to the coach; accepting twice keeps the first link. */
  async acceptInvite(
    userId: string,
    code: string,
  ): Promise<LinkedUserResponse> {
    const coach = await this.findInviter(userId, code);
    const where = { coachId_clientId: { coachId: coach.id, clientId: userId } };

    try {
      const link = await this.prisma.client.coachClient.create({
        data: { coachId: coach.id, clientId: userId },
        select: { createdAt: true },
      });
      return toLinkedUser({ createdAt: link.createdAt, user: coach });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const link = await this.prisma.client.coachClient.findUniqueOrThrow({
        where,
        select: { createdAt: true },
      });
      return toLinkedUser({ createdAt: link.createdAt, user: coach });
    }
  }

  async removeCoach(clientId: string, coachId: string): Promise<void> {
    const result = await this.prisma.client.coachClient.deleteMany({
      where: { coachId, clientId },
    });
    if (result.count === 0) throw new NotFoundException('Coach was not found.');
  }

  private async findInviter(
    userId: string,
    code: string,
  ): Promise<{ id: string; username: string }> {
    const normalized = normalizeInviteCode(code);
    const coach = normalized
      ? await this.prisma.client.user.findFirst({
          where: { coachInviteCode: normalized, isCoach: true },
          select: { id: true, username: true },
        })
      : null;

    if (!coach) throw new NotFoundException('Invite code was not found.');
    if (coach.id === userId) {
      throw new BadRequestException('You cannot coach yourself.');
    }
    return coach;
  }

  /** Stores a fresh unique code, retrying on the rare collision. */
  private async saveInviteCode(
    userId: string,
    currentCode: string | null,
  ): Promise<CoachStatusResponse> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = currentCode ?? generateInviteCode();
      try {
        await this.prisma.client.user.update({
          where: { id: userId },
          data: { isCoach: true, coachInviteCode: inviteCode },
        });
        return { isCoach: true, inviteCode };
      } catch (error) {
        if (!isUniqueViolation(error) || currentCode) throw error;
      }
    }
    throw new Error('Could not generate a unique invite code.');
  }
}
