import { describe, expect, it } from 'vitest';

import { monthGrid, shiftMonth, toMonthKey } from './calendar';
import {
  formatSchedule,
  isScheduledOn,
  toggleWeekday,
  weekdayBit,
} from './weekdays';

describe('calendar grid', () => {
  it('starts weeks on Monday and pads with neighbouring days', () => {
    // September 2026 starts on a Tuesday and has 30 days.
    const weeks = monthGrid('2026-09');

    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0].key).toBe('2026-08-31');
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][1].key).toBe('2026-09-01');
    expect(weeks[4][2].key).toBe('2026-09-30');
    expect(weeks[4][6].key).toBe('2026-10-04');
  });

  it('moves between months across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(toMonthKey(new Date(2026, 8, 26))).toBe('2026-09');
  });
});

describe('weekday schedule', () => {
  it('maps Monday to 1 and Sunday to 64', () => {
    expect(weekdayBit(new Date(2026, 8, 28))).toBe(1); // Monday
    expect(weekdayBit(new Date(2026, 8, 27))).toBe(64); // Sunday
  });

  it('toggles and reads days', () => {
    const mask = toggleWeekday(toggleWeekday(0, 1), 16);
    expect(mask).toBe(17);
    expect(isScheduledOn(mask, new Date(2026, 9, 2))).toBe(true); // Friday
    expect(isScheduledOn(mask, new Date(2026, 8, 29))).toBe(false); // Tuesday
    expect(formatSchedule(mask)).toBe('Pzt, Cum');
    expect(formatSchedule(0)).toBe('Gün seçilmedi');
    expect(formatSchedule(127)).toBe('Her gün');
  });
});
