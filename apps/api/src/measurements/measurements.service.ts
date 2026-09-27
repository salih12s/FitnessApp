import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMeasurementDto } from './measurement.dto.js';

const measurementSelect = {
  id: true,
  measuredAt: true,
  weightKg: true,
  bodyFatPercent: true,
  waistCm: true,
  chestCm: true,
  armCm: true,
  note: true,
} as const;

type MeasurementRow = {
  id: string;
  measuredAt: Date;
  weightKg: { toString(): string } | null;
  bodyFatPercent: { toString(): string } | null;
  waistCm: { toString(): string } | null;
  chestCm: { toString(): string } | null;
  armCm: { toString(): string } | null;
  note: string | null;
};

function toResponse(row: MeasurementRow) {
  return {
    id: row.id,
    measuredAt: row.measuredAt.toISOString().slice(0, 10),
    weightKg: row.weightKg?.toString() ?? null,
    bodyFatPercent: row.bodyFatPercent?.toString() ?? null,
    waistCm: row.waistCm?.toString() ?? null,
    chestCm: row.chestCm?.toString() ?? null,
    armCm: row.armCm?.toString() ?? null,
    note: row.note,
  };
}

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.client.bodyMeasurement.findMany({
      where: { userId },
      orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
      select: measurementSelect,
    });
    return rows.map(toResponse);
  }

  async create(userId: string, dto: CreateMeasurementDto) {
    const measuredAt = new Date(`${dto.measuredAt}T00:00:00.000Z`);
    if (
      Number.isNaN(measuredAt.getTime()) ||
      measuredAt.toISOString().slice(0, 10) !== dto.measuredAt
    ) {
      throw new BadRequestException('Measurement date is invalid.');
    }
    if (
      [
        dto.weightKg,
        dto.bodyFatPercent,
        dto.waistCm,
        dto.chestCm,
        dto.armCm,
      ].every((value) => value === undefined)
    ) {
      throw new BadRequestException('Enter at least one measurement.');
    }
    if (dto.bodyFatPercent && Number(dto.bodyFatPercent) > 100) {
      throw new BadRequestException('Body fat percent cannot exceed 100.');
    }

    const row = await this.prisma.client.bodyMeasurement.create({
      data: {
        userId,
        measuredAt,
        weightKg: dto.weightKg,
        bodyFatPercent: dto.bodyFatPercent,
        waistCm: dto.waistCm,
        chestCm: dto.chestCm,
        armCm: dto.armCm,
        note: dto.note?.trim() || null,
      },
      select: measurementSelect,
    });
    return toResponse(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.client.bodyMeasurement.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Measurement was not found.');
    }
  }
}
