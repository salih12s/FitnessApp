import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthResponse {
  status: 'ok';
}

export interface DatabaseHealthResponse extends HealthResponse {
  database: 'connected';
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthResponse {
    return { status: 'ok' };
  }

  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    if (!(await this.prisma.isDatabaseConnected())) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
      });
    }

    return { status: 'ok', database: 'connected' };
  }
}
