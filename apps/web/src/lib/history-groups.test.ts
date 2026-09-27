import { describe, expect, it } from 'vitest';

import type { HistoryLog } from '@/types/history';
import type { HistorySession } from '@/types/session';
import { groupHistory, totalVolumeKg } from './history-groups';

const session: HistorySession = {
  id: 'session-1',
  startedAt: '2026-09-20T15:00:00',
  endedAt: '2026-09-20T16:00:00',
  note: null,
};

function log(
  id: string,
  performedAt: string,
  logSession: HistorySession | null,
): HistoryLog {
  return {
    id,
    performedAt,
    session: logSession,
    enteredBy: null,
    sets: [
      { setNumber: 1, weightKg: '80', reps: 8 },
      { setNumber: 2, weightKg: '82.5', reps: 6 },
    ],
    exercise: {
      name: id,
      slug: id,
      isCustom: false,
      muscleGroup: { name: 'Göğüs', slug: 'gogus' },
    },
  };
}

describe('history grouping', () => {
  it('keeps days in order and gathers a session into one block', () => {
    const days = groupHistory([
      log('row', '2026-09-20T15:40:00', session),
      log('curl', '2026-09-20T12:00:00', null),
      log('bench', '2026-09-20T15:10:00', session),
      log('squat', '2026-09-18T18:00:00', null),
    ]);

    expect(days.map((day) => day.dateKey)).toEqual([
      '2026-09-20',
      '2026-09-18',
    ]);
    expect(days[0].logCount).toBe(3);
    expect(
      days[0].blocks.map((block) =>
        block.kind === 'session'
          ? `session:${block.logs.map((entry) => entry.id).join('+')}`
          : `log:${block.log.id}`,
      ),
    ).toEqual(['session:row+bench', 'log:curl']);
    expect(days[1].blocks).toHaveLength(1);
  });

  it('adds up weight times reps', () => {
    expect(totalVolumeKg([log('a', '2026-09-20T10:00:00', null)])).toBe(
      80 * 8 + 82.5 * 6,
    );
  });
});
