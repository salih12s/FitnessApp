// Synthetic training data for demo accounts. Everything here is pure: the
// caller passes the clock and the random source, so the output is repeatable.

const DAY_MS = 24 * 60 * 60 * 1000;
/** Demo users train in Türkiye (UTC+3, no daylight saving time). */
const LOCAL_OFFSET_MS = 3 * 60 * 60 * 1000;
const MINUTES_PER_EXERCISE = 12;

export type Random = () => number;

/** Small seeded generator (mulberry32); `Math.random` would not be testable. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export interface DemoExercisePlan {
  slug: string;
  sets: number;
  reps: number;
  startKg: number;
  /** Added every second week (double progression). */
  stepKg: number;
}

export interface DemoProgramPlan {
  name: string;
  /** Weekday bitmask used by templates: Monday = 1 ... Sunday = 64. */
  scheduledDays: number;
  exercises: DemoExercisePlan[];
}

export interface DemoSet {
  weightKg: string;
  reps: number;
}

export interface DemoLog {
  slug: string;
  performedAt: Date;
  notes: string | null;
  sets: DemoSet[];
}

export interface DemoWorkout {
  programIndex: number;
  startedAt: Date;
  endedAt: Date;
  note: string | null;
  logs: DemoLog[];
}

export interface HistoryOptions {
  programs: readonly DemoProgramPlan[];
  weeks: number;
  now: Date;
  random: Random;
  /** Share of scheduled days that are skipped, like a real calendar. */
  skipRate: number;
  /** No workouts in this many most recent days (0 = train until yesterday). */
  restDays?: number;
}

const SESSION_NOTES = [
  'Enerji yüksekti, iyi geçti.',
  'Uykusuz geldim, ağırlıkları zorlamadım.',
  'Isınmayı uzun tuttum.',
  'Salon kalabalıktı, dinlenmeler uzun oldu.',
  'Bugün her şey hafif hissettirdi.',
];

const LOG_NOTES = [
  'Son sette form bozuldu.',
  'Tempoyu yavaşlattım.',
  'Bir sonraki sefere ağırlığı artır.',
  'Kemer kullandım.',
];

/** The weekday bit of a UTC instant, read in local (Türkiye) time. */
export function localWeekdayBit(instant: Date): number {
  const weekday = new Date(instant.getTime() + LOCAL_OFFSET_MS).getUTCDay();
  return 1 << ((weekday + 6) % 7);
}

/** A UTC instant for the given local date at `hour:minute` local time. */
function atLocalTime(day: Date, hour: number, minute: number): Date {
  const local = new Date(day.getTime() + LOCAL_OFFSET_MS);
  return new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
      hour,
      minute,
    ) - LOCAL_OFFSET_MS,
  );
}

/** Local calendar date as a UTC midnight, the format of `@db.Date` columns. */
export function localDate(day: Date): Date {
  const local = new Date(day.getTime() + LOCAL_OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
}

/** Working weight for a week: starts at `startKg`, climbs every two weeks. */
export function weightForWeek(plan: DemoExercisePlan, week: number): number {
  return plan.startKg + plan.stepKg * Math.floor(week / 2);
}

function buildSets(
  plan: DemoExercisePlan,
  week: number,
  random: Random,
): DemoSet[] {
  const weightKg = weightForWeek(plan, week).toFixed(2);
  // The week after a weight increase adds a rep; later sets may lose one.
  const topReps = plan.reps + (week % 2);
  return Array.from({ length: plan.sets }, (_, index) => ({
    weightKg,
    reps: Math.max(1, topReps - (index >= 2 && random() < 0.5 ? 1 : 0)),
  }));
}

/**
 * Workouts on the programs' scheduled days, oldest first, from `weeks` weeks
 * ago up to yesterday. Every workout ends before `now`.
 */
export function buildHistory(options: HistoryOptions): DemoWorkout[] {
  const { programs, weeks, now, random, skipRate, restDays = 0 } = options;
  const totalDays = weeks * 7;
  const workouts: DemoWorkout[] = [];

  for (let daysAgo = totalDays; daysAgo > Math.max(restDays, 0); daysAgo -= 1) {
    const day = new Date(now.getTime() - daysAgo * DAY_MS);
    const bit = localWeekdayBit(day);
    const programIndex = programs.findIndex(
      (program) => (program.scheduledDays & bit) !== 0,
    );
    if (programIndex === -1 || random() < skipRate) continue;

    const week = Math.floor((totalDays - daysAgo) / 7);
    const program = programs[programIndex];
    const startedAt = atLocalTime(
      day,
      17 + Math.floor(random() * 3),
      Math.floor(random() * 60),
    );
    const logs = program.exercises.map((plan, index) => ({
      slug: plan.slug,
      performedAt: new Date(
        startedAt.getTime() + (index * MINUTES_PER_EXERCISE + 8) * 60_000,
      ),
      notes: random() < 0.08 ? pick(random, LOG_NOTES) : null,
      sets: buildSets(plan, week, random),
    }));

    workouts.push({
      programIndex,
      startedAt,
      endedAt: new Date(
        startedAt.getTime() +
          (program.exercises.length * MINUTES_PER_EXERCISE + 15) * 60_000,
      ),
      note: random() < 0.25 ? pick(random, SESSION_NOTES) : null,
      logs,
    });
  }

  return workouts;
}

export interface MeasurementRange {
  weightKg: [number, number];
  bodyFatPercent?: [number, number];
  waistCm?: [number, number];
  chestCm?: [number, number];
  armCm?: [number, number];
}

export interface DemoMeasurement {
  measuredAt: Date;
  weightKg: string;
  bodyFatPercent: string | null;
  waistCm: string | null;
  chestCm: string | null;
  armCm: string | null;
}

/** Weekly measurements that move from the start to the end of each range. */
export function buildMeasurements(
  range: MeasurementRange,
  weeks: number,
  now: Date,
  random: Random,
): DemoMeasurement[] {
  const value = (
    bounds: [number, number] | undefined,
    progress: number,
    digits: number,
  ): string | null => {
    if (!bounds) return null;
    const [start, end] = bounds;
    const noise = (random() - 0.5) * Math.abs(end - start) * 0.1;
    return (start + (end - start) * progress + noise).toFixed(digits);
  };

  return Array.from({ length: weeks + 1 }, (_, index) => {
    const progress = weeks === 0 ? 1 : index / weeks;
    return {
      measuredAt: localDate(
        new Date(now.getTime() - (weeks - index) * 7 * DAY_MS),
      ),
      weightKg: value(range.weightKg, progress, 1) ?? '0',
      bodyFatPercent: value(range.bodyFatPercent, progress, 1),
      waistCm: value(range.waistCm, progress, 1),
      chestCm: value(range.chestCm, progress, 1),
      armCm: value(range.armCm, progress, 1),
    };
  });
}

// Weekday bits.
const MON = 1;
const TUE = 2;
const WED = 4;
const THU = 8;
const FRI = 16;
const SAT = 32;

/** The custom exercise every demo account owns. */
export const DEMO_CUSTOM_EXERCISE = {
  name: 'Landmine Row',
  slug: 'landmine-row',
  equipment: 'Landmine',
  muscleGroupSlug: 'sirt',
} as const;

/** The demo account's own push / pull / legs split. */
export const DEMO_OWNER_PROGRAMS: readonly DemoProgramPlan[] = [
  {
    name: 'İtiş (Göğüs, Omuz, Triceps)',
    scheduledDays: MON | THU,
    exercises: [
      {
        slug: 'barbell-bench-press',
        sets: 4,
        reps: 6,
        startKg: 70,
        stepKg: 2.5,
      },
      {
        slug: 'incline-dumbbell-bench-press',
        sets: 3,
        reps: 8,
        startKg: 24,
        stepKg: 2,
      },
      {
        slug: 'barbell-overhead-press',
        sets: 3,
        reps: 6,
        startKg: 42.5,
        stepKg: 2.5,
      },
      {
        slug: 'dumbbell-lateral-raise',
        sets: 3,
        reps: 12,
        startKg: 8,
        stepKg: 1,
      },
      { slug: 'rope-pushdown', sets: 3, reps: 12, startKg: 22.5, stepKg: 2.5 },
    ],
  },
  {
    name: 'Çekiş (Sırt, Biceps)',
    scheduledDays: TUE | FRI,
    exercises: [
      { slug: 'deadlift', sets: 3, reps: 5, startKg: 120, stepKg: 5 },
      {
        slug: 'wide-grip-lat-pulldown',
        sets: 3,
        reps: 10,
        startKg: 55,
        stepKg: 2.5,
      },
      { slug: 'barbell-row', sets: 3, reps: 8, startKg: 60, stepKg: 2.5 },
      {
        slug: DEMO_CUSTOM_EXERCISE.slug,
        sets: 3,
        reps: 10,
        startKg: 30,
        stepKg: 2.5,
      },
      { slug: 'barbell-curl', sets: 3, reps: 10, startKg: 27.5, stepKg: 2.5 },
    ],
  },
  {
    name: 'Bacak ve Karın',
    scheduledDays: WED | SAT,
    exercises: [
      { slug: 'back-squat', sets: 4, reps: 6, startKg: 90, stepKg: 5 },
      { slug: 'romanian-deadlift', sets: 3, reps: 8, startKg: 80, stepKg: 5 },
      { slug: 'leg-press', sets: 3, reps: 12, startKg: 160, stepKg: 10 },
      { slug: 'lying-leg-curl', sets: 3, reps: 12, startKg: 40, stepKg: 2.5 },
      {
        slug: 'standing-calf-raise',
        sets: 4,
        reps: 15,
        startKg: 60,
        stepKg: 5,
      },
      { slug: 'cable-crunch', sets: 3, reps: 15, startKg: 35, stepKg: 2.5 },
    ],
  },
];

/** The coach's plan for clients; the first client follows an assigned copy. */
export const DEMO_CLIENT_PROGRAM: DemoProgramPlan = {
  name: 'Tam Vücut Başlangıç',
  scheduledDays: MON | WED | FRI,
  exercises: [
    { slug: 'goblet-squat', sets: 3, reps: 12, startKg: 16, stepKg: 2 },
    { slug: 'dumbbell-bench-press', sets: 3, reps: 10, startKg: 12, stepKg: 1 },
    { slug: 'seated-cable-row', sets: 3, reps: 12, startKg: 30, stepKg: 2.5 },
    {
      slug: 'dumbbell-shoulder-press',
      sets: 3,
      reps: 10,
      startKg: 8,
      stepKg: 1,
    },
    { slug: 'barbell-hip-thrust', sets: 3, reps: 10, startKg: 40, stepKg: 5 },
  ],
};

/** The second client's own upper / lower split. */
export const DEMO_SECOND_CLIENT_PROGRAMS: readonly DemoProgramPlan[] = [
  {
    name: 'Alt Vücut',
    scheduledDays: MON | THU,
    exercises: [
      { slug: 'back-squat', sets: 3, reps: 8, startKg: 70, stepKg: 2.5 },
      { slug: 'leg-extension', sets: 3, reps: 12, startKg: 45, stepKg: 5 },
      { slug: 'seated-leg-curl', sets: 3, reps: 12, startKg: 35, stepKg: 2.5 },
      { slug: 'seated-calf-raise', sets: 3, reps: 15, startKg: 30, stepKg: 5 },
    ],
  },
  {
    name: 'Üst Vücut',
    scheduledDays: TUE | FRI,
    exercises: [
      {
        slug: 'dumbbell-bench-press',
        sets: 3,
        reps: 8,
        startKg: 26,
        stepKg: 2,
      },
      {
        slug: 'neutral-grip-lat-pulldown',
        sets: 3,
        reps: 10,
        startKg: 50,
        stepKg: 2.5,
      },
      {
        slug: 'dumbbell-shoulder-press',
        sets: 3,
        reps: 10,
        startKg: 16,
        stepKg: 2,
      },
      { slug: 'hammer-curl', sets: 3, reps: 12, startKg: 12, stepKg: 1 },
    ],
  },
];
