import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser, UserCredentials } from './user.types.js';

const publicUserSelect = {
  id: true,
  username: true,
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
}
