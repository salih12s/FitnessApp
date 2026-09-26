import { describe, expect, it } from 'vitest';

import {
  isCustomExerciseFormComplete,
  normalizeCustomExerciseForm,
} from './custom-exercise-form';

describe('custom exercise form', () => {
  it('requires a name, muscle group, and equipment', () => {
    expect(
      isCustomExerciseFormComplete({
        name: '',
        muscleGroup: 'sirt',
        equipment: 'Kablo',
        instructions: '',
      }),
    ).toBe(false);
    expect(
      isCustomExerciseFormComplete({
        name: 'Row',
        muscleGroup: 'sirt',
        equipment: 'Kablo',
        instructions: '',
      }),
    ).toBe(true);
  });

  it('normalizes whitespace while keeping optional instructions undefined when empty', () => {
    expect(
      normalizeCustomExerciseForm({
        name: '  Tek   Kol  ',
        muscleGroup: 'sirt',
        equipment: ' Kablo ',
        instructions: '  Kontrollü   çekiş  ',
      }),
    ).toEqual({
      name: 'Tek Kol',
      muscleGroup: 'sirt',
      equipment: 'Kablo',
      instructions: 'Kontrollü çekiş',
    });
    expect(
      normalizeCustomExerciseForm({
        name: 'Row',
        muscleGroup: 'sirt',
        equipment: 'Kablo',
        instructions: ' ',
      }).instructions,
    ).toBeUndefined();
  });

  it('keeps line breaks in instructions', () => {
    expect(
      normalizeCustomExerciseForm({
        name: 'Row',
        muscleGroup: 'sirt',
        equipment: 'Kablo',
        instructions: '  1.  Otur \r\n2. Çek  \n\n\n\n3. Bırak ',
      }).instructions,
    ).toBe('1. Otur\n2. Çek\n\n3. Bırak');
  });
});
