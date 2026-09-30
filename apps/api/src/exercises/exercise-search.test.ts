import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { INITIAL_MUSCLE_GROUPS } from '../muscle-groups/muscle-group.constants.js';
import { CURATED_EXERCISES } from './exercise-library.js';
import {
  normalizeSearchText,
  rankExercises,
  type SearchableExercise,
} from './exercise-search.js';

const library: SearchableExercise[] = CURATED_EXERCISES.map((exercise) => ({
  name: exercise.name,
  equipment: exercise.equipment,
  description: exercise.instructions,
  muscleGroup: {
    slug: exercise.muscleGroup,
    name:
      INITIAL_MUSCLE_GROUPS.find(({ slug }) => slug === exercise.muscleGroup)
        ?.name ?? exercise.muscleGroup,
  },
}));

function names(query: string): string[] {
  return rankExercises(library, query).map(({ name }) => name);
}

describe('normalizeSearchText', () => {
  it('folds Turkish letters and case', () => {
    assert.equal(
      normalizeSearchText('  GÖĞÜS Şınav İp Karın  '),
      'gogus sinav ip karin',
    );
  });

  it('turns punctuation into spaces', () => {
    assert.equal(normalizeSearchText('Pull-Up (Bar)'), 'pull up bar');
  });
});

describe('rankExercises', () => {
  it('finds every library exercise by its own name, best match first', () => {
    for (const { name } of library) {
      assert.equal(
        names(name)[0],
        name,
        `"${name}" should be its own top result`,
      );
    }
  });

  it('ignores word order', () => {
    assert.ok(names('press bench').includes('Barbell Bench Press'));
  });

  it('matches a muscle group with or without Turkish letters', () => {
    const chest = library.filter(
      ({ muscleGroup }) => muscleGroup.slug === 'gogus',
    );
    assert.ok(chest.length > 0);
    for (const query of ['göğüs', 'gogus', 'GÖĞÜS']) {
      const found = names(query);
      for (const { name } of chest) {
        assert.ok(found.includes(name), `"${query}" should find ${name}`);
      }
    }
  });

  it('understands Turkish equipment and movement words', () => {
    assert.ok(names('dambıl curl').includes('Dumbbell Curl'));
    assert.ok(names('halter göğüs').includes('Barbell Bench Press'));
    assert.ok(names('sırt kablo').includes('Seated Cable Row'));
    assert.ok(names('barfiks').includes('Pull Up'));
    assert.ok(names('şınav').includes('Push Up'));
    assert.ok(names('mekik').includes('Crunch'));
  });

  it('understands multi-word Turkish phrases', () => {
    assert.ok(names('ön kol').includes('Seated Wrist Curl'));
    assert.ok(names('ölü kaldırış').includes('Deadlift'));
  });

  it('does not pull in unrelated grip exercises for a forearm search', () => {
    const found = names('ön kol');
    assert.ok(found.includes('Seated Wrist Curl'));
    assert.ok(!found.includes('Close Grip Lat Pulldown'));
  });

  it('requires every word of the query to match', () => {
    const found = names('barbell curl');
    assert.ok(found.length > 0);
    assert.ok(!found.includes('Cable Curl'));
  });

  it('tolerates small typos', () => {
    assert.ok(names('benc press').includes('Barbell Bench Press'));
    assert.ok(names('shoudler press').includes('Dumbbell Shoulder Press'));
  });

  it('matches by muscle group in English too', () => {
    assert.ok(names('chest').includes('Pec Deck'));
  });

  it('finds an exercise by both its custom and original name', () => {
    const renamed: SearchableExercise = {
      name: 'Benim Göğüs Günüm',
      originalName: 'Barbell Bench Press',
      equipment: 'Barbell',
      muscleGroup: { slug: 'gogus', name: 'Göğüs' },
    };
    assert.equal(rankExercises([renamed], 'benim gun').length, 1);
    assert.equal(rankExercises([renamed], 'barbell bench').length, 1);
  });

  it('returns nothing for unrelated or empty queries', () => {
    assert.deepEqual(names('zzzzqqxx'), []);
    assert.deepEqual(names('   '), []);
  });

  it('caps the number of results', () => {
    assert.equal(rankExercises(library, 'press', 5).length, 5);
  });
});
