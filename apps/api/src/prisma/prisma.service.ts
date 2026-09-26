import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaClient } from '../generated/prisma/client.js';
import { toMariaDbConfig } from './database-url.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prismaClient: PrismaClient | null;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL')?.trim();

    this.prismaClient = connectionString
      ? new PrismaClient({
          adapter: new PrismaMariaDb(toMariaDbConfig(connectionString)),
        })
      : null;
  }

  get client(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('DATABASE_URL is not configured.');
    }

    return this.prismaClient;
  }

  async onModuleInit(): Promise<void> {
    await this.prismaClient?.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prismaClient?.$disconnect();
  }

  async isDatabaseConnected(): Promise<boolean> {
    if (!this.prismaClient) {
      return false;
    }

    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
