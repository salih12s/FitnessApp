import type { HistoryLog } from '@/types/history';
import type { HistorySession } from '@/types/session';

export type HistoryBlock =
  | { kind: 'session'; session: HistorySession; logs: HistoryLog[] }
  | { kind: 'log'; log: HistoryLog };

export interface HistoryDay {
  /** Local calendar day as YYYY-MM-DD. */
  dateKey: string;
  logCount: number;
  blocks: HistoryBlock[];
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Groups newest-first logs by local day, then gathers logs of the same
 * session into one block placed where that session's newest log appears.
 * Logs without a session stay individual blocks.
 */
export function groupHistory(logs: HistoryLog[]): HistoryDay[] {
  const days = new Map<string, HistoryDay>();
  const sessionBlocks = new Map<string, HistoryLog[]>();

  for (const log of logs) {
    const dateKey = toDateKey(new Date(log.performedAt));
    let day = days.get(dateKey);

    if (!day) {
      day = { dateKey, logCount: 0, blocks: [] };
      days.set(dateKey, day);
    }
    day.logCount += 1;

    if (!log.session) {
      day.blocks.push({ kind: 'log', log });
      continue;
    }

    // A session that runs past midnight is shown once per day it touches.
    const blockKey = `${dateKey}:${log.session.id}`;
    const sessionLogs = sessionBlocks.get(blockKey);

    if (sessionLogs) {
      sessionLogs.push(log);
    } else {
      const newLogs = [log];
      sessionBlocks.set(blockKey, newLogs);
      day.blocks.push({ kind: 'session', session: log.session, logs: newLogs });
    }
  }

  return [...days.values()];
}

/** Sum of weight × reps across the given logs, in kg. */
export function totalVolumeKg(logs: HistoryLog[]): number {
  return logs.reduce(
    (sum, log) =>
      sum +
      log.sets.reduce(
        (setSum, set) => setSum + Number(set.weightKg) * set.reps,
        0,
      ),
    0,
  );
}
