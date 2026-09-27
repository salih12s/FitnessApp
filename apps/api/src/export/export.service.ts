import { Readable } from 'node:stream';
import { Injectable, StreamableFile } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  logsCsv(userId: string): StreamableFile {
    return new StreamableFile(Readable.from(this.streamRows(userId)), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="workout-logs.csv"',
    });
  }

  private async *streamRows(userId: string): AsyncGenerator<string> {
    yield '\uFEFF';
    yield 'date,exercise,muscle_group,set,weight_kg,reps,session_start,session_note\r\n';

    let cursor: string | undefined;
    while (true) {
      const logs = await this.prisma.client.exerciseLog.findMany({
        where: { userId },
        orderBy: [{ performedAt: 'asc' }, { id: 'asc' }],
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          performedAt: true,
          exerciseSets: {
            orderBy: { setNumber: 'asc' },
            select: { setNumber: true, weightKg: true, reps: true },
          },
          exercise: {
            select: {
              name: true,
              muscleGroup: { select: { name: true } },
              preferences: {
                where: { userId },
                select: { customName: true },
              },
            },
          },
          session: { select: { startedAt: true, note: true } },
        },
      });
      if (logs.length === 0) return;

      for (const log of logs) {
        const exerciseName =
          log.exercise.preferences[0]?.customName ?? log.exercise.name;
        for (const set of log.exerciseSets) {
          yield [
            log.performedAt.toISOString(),
            exerciseName,
            log.exercise.muscleGroup.name,
            set.setNumber,
            set.weightKg.toString(),
            set.reps,
            log.session?.startedAt.toISOString() ?? '',
            log.session?.note ?? '',
          ]
            .map(csvCell)
            .join(',') + '\r\n';
        }
      }
      cursor = logs.at(-1)?.id;
    }
  }
}
