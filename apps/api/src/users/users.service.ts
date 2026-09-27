import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { Prisma, type WeightUnit } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser, UserCredentials } from './user.types.js';

const publicUserSelect = {
  id: true,
  username: true,
  weightUnit: true,
  isCoach: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(username: string, passwordHash: string): Promise<PublicUser> {
    try {
      return await this.prisma.client.user.create({
        data: { username, passwordHash },
        select: publicUserSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bu kullanıcı adı zaten alınmış.');
      }

      throw error;
    }
  }

  findByUsernameWithPassword(
    username: string,
  ): Promise<UserCredentials | null> {
    return this.prisma.client.user.findUnique({
      where: { username },
      select: {
        ...publicUserSelect,
        passwordHash: true,
      },
    });
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  updateWeightUnit(
    userId: string,
    weightUnit: WeightUnit,
  ): Promise<PublicUser> {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: { weightUnit },
      select: publicUserSelect,
    });
  }

  async deleteAccount(
    userId: string,
    password: string,
    confirmation: string,
  ): Promise<void> {
    if (confirmation !== 'hesabımı sil') {
      throw new BadRequestException(
        'Account deletion confirmation is invalid.',
      );
    }

    await this.prisma.client.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });
      if (!user || !(await argon2.verify(user.passwordHash, password))) {
        throw new ForbiddenException('Current password is incorrect.');
      }

      await transaction.exerciseLog.deleteMany({ where: { userId } });
      await transaction.workoutSession.deleteMany({ where: { userId } });
      await transaction.workoutTemplate.deleteMany({ where: { userId } });
      await transaction.bodyMeasurement.deleteMany({ where: { userId } });
      await transaction.exercisePreference.deleteMany({ where: { userId } });
      await transaction.refreshSession.deleteMany({ where: { userId } });
      await transaction.exercise.deleteMany({
        where: { createdByUserId: userId },
      });
      await transaction.user.delete({ where: { id: userId } });
    });
  }
}
