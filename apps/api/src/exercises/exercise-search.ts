/**
 * Relevance search over a user's exercise library.
 *
 * The library is small (a few hundred rows at most) and its names are English
 * while users type Turkish, so matching happens in memory instead of with SQL
 * `LIKE`: that makes it independent of the database collation and lets it
 * handle Turkish letters, word order, Turkish equivalents and small typos.
 */

export interface SearchableExercise {
  name: string;
  /** The library name when the user renamed the exercise, so both find it. */
  originalName?: string | null;
  equipment: string | null;
  description?: string | null;
  muscleGroup: { name: string; slug: string };
}

/** Extra words that also identify a muscle group (English + colloquial). */
const MUSCLE_KEYWORDS: Record<string, string> = {
  gogus: 'chest pec pecs pectoral',
  sirt: 'back lat lats',
  omuz: 'shoulder shoulders delt delts deltoid',
  biceps: 'bicep arm',
  triceps: 'tricep arm',
  'on-kol': 'forearm grip wrist',
  bacak: 'leg legs quad quads hamstring glute glutes calf thigh',
  karin: 'abs ab core abdominal stomach',
};

/** Turkish (or misspelled) query words and the English words they stand for. */
const WORD_ALIASES: Record<string, string[]> = {
  halter: ['barbell'],
  dambil: ['dumbbell'],
  dumbel: ['dumbbell'],
  dumbell: ['dumbbell'],
  kablo: ['cable'],
  makara: ['cable'],
  makine: ['machine'],
  aparat: ['machine'],
  vucut: ['bodyweight'],
  disk: ['plate'],
  plaka: ['plate'],
  top: ['ball'],
  ip: ['rope'],
  halat: ['rope'],
  barfiks: ['pull up', 'chin up', 'hang'],
  sinav: ['push up'],
  mekik: ['crunch', 'sit up'],
  comelme: ['squat'],
  skuat: ['squat'],
  hamle: ['lunge'],
  kurek: ['row'],
  cekis: ['pull', 'row'],
  cekme: ['pull', 'row'],
  itis: ['press'],
  pres: ['press'],
  bukme: ['curl'],
  acilis: ['fly'],
  kaldiris: ['raise', 'lift', 'deadlift'],
  uzatma: ['extension'],
  ekstansiyon: ['extension'],
  dips: ['dip'],
  paralel: ['dip'],
  kalca: ['hip', 'glute'],
  baldir: ['calf'],
  uyluk: ['leg'],
  bilek: ['wrist'],
  kol: ['arm'],
  arka: ['rear', 'reverse'],
  ters: ['reverse'],
  yan: ['lateral', 'side'],
  egik: ['incline'],
  duz: ['flat'],
  dar: ['close'],
  genis: ['wide'],
  tek: ['single'],
  oturarak: ['seated'],
  oturma: ['seated'],
  ayakta: ['standing'],
  yatarak: ['lying'],
  asilma: ['hang'],
  yuruyus: ['walking'],
  adim: ['step'],
  kopru: ['bridge'],
  biseps: ['biceps'],
  bisep: ['biceps'],
  triseps: ['triceps'],
  trisep: ['triceps'],
};

/** Multi-word Turkish phrases, checked before the query is split into words. */
const PHRASE_ALIASES: [phrase: string, alternatives: string[]][] = [
  ['olu kaldiris', ['deadlift']],
  ['vucut agirligi', ['bodyweight']],
  ['on kol', ['forearm', 'wrist']],
  ['on omuz', ['front raise']],
  ['arka omuz', ['rear delt', 'face pull']],
  ['yan omuz', ['lateral raise']],
  ['arka bacak', ['hamstring', 'leg curl', 'deadlift']],
  ['on bacak', ['quad', 'leg extension', 'squat']],
  ['tek kol', ['single arm']],
  ['dar tutus', ['close grip']],
  ['genis tutus', ['wide grip']],
  ['ters tutus', ['reverse grip']],
  ['kurek cekme', ['row']],
  ['ust gogus', ['incline']],
  ['alt gogus', ['decline']],
];

/** Lowercase, drop Turkish diacritics and punctuation, collapse spaces. */
export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface TokenGroup {
  /** The query word as typed, followed by its Turkish/English equivalents. */
  alternatives: string[];
  /** Whether the group may be matched with typo tolerance. */
  fuzzy: boolean;
}

export function buildTokenGroups(query: string): TokenGroup[] {
  let rest = ` ${normalizeSearchText(query)} `;
  const groups: TokenGroup[] = [];

  for (const [phrase, alternatives] of PHRASE_ALIASES) {
    if (rest.includes(` ${phrase} `)) {
      rest = rest.replace(` ${phrase} `, ' ');
      groups.push({ alternatives: [phrase, ...alternatives], fuzzy: false });
    }
  }

  for (const word of rest.split(' ').filter(Boolean)) {
    groups.push({
      alternatives: [word, ...(WORD_ALIASES[word] ?? [])],
      fuzzy: word.length >= 4,
    });
  }

  return groups;
}

export function levenshtein(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[b.length];
}

interface Field {
  /** Normalized text padded with spaces so `" word"` finds word starts. */
  text: string;
  words: string[];
  prefixScore: number;
  substringScore: number;
}

function toField(
  value: string | null | undefined,
  prefixScore: number,
  substringScore: number,
): Field {
  const normalized = normalizeSearchText(value ?? '');
  return {
    text: ` ${normalized} `,
    words: normalized.split(' ').filter(Boolean),
    prefixScore,
    substringScore,
  };
}

function scoreAlternative(alternative: string, fields: Field[]): number {
  let best = 0;
  for (const field of fields) {
    if (field.text.includes(` ${alternative}`)) {
      best = Math.max(best, field.prefixScore);
    } else if (alternative.length >= 3 && field.text.includes(alternative)) {
      best = Math.max(best, field.substringScore);
    }
  }
  return best;
}

function scoreTypo(word: string, fields: Field[]): number {
  const allowed = word.length >= 8 ? 2 : 1;
  for (const field of fields) {
    for (const candidate of field.words) {
      // Compare with the word start too, so half-typed words still match.
      const start = candidate.slice(0, word.length);
      if (
        levenshtein(word, candidate, allowed) <= allowed ||
        levenshtein(word, start, allowed) <= allowed
      ) {
        return 2;
      }
    }
  }
  return 0;
}

/**
 * Relevance of one exercise for a query, or 0 when it does not match. Every
 * word of the query must match somewhere; names count most, then muscle
 * group, equipment and finally the instructions.
 */
export function scoreExercise(
  exercise: SearchableExercise,
  groups: TokenGroup[],
  fullQuery: string,
): number {
  if (groups.length === 0) return 0;

  const nameField = toField(
    `${exercise.name} ${exercise.originalName ?? ''}`,
    10,
    6,
  );
  const fields = [
    nameField,
    toField(
      `${exercise.muscleGroup.name} ${MUSCLE_KEYWORDS[exercise.muscleGroup.slug] ?? ''}`,
      7,
      4,
    ),
    toField(exercise.equipment, 6, 3),
    toField(exercise.description, 1.5, 1),
  ];

  let total = 0;
  for (const group of groups) {
    let groupScore = 0;
    group.alternatives.forEach((alternative, index) => {
      // An equivalent counts a little less than the word the user typed.
      const weight = index === 0 ? 1 : 0.8;
      groupScore = Math.max(
        groupScore,
        scoreAlternative(alternative, fields) * weight,
      );
    });

    if (groupScore === 0 && group.fuzzy) {
      groupScore = scoreTypo(group.alternatives[0], fields.slice(0, 3));
    }
    if (groupScore === 0) return 0;
    total += groupScore;
  }

  // Reward names that contain the whole phrase, most of all at the start.
  const normalizedQuery = normalizeSearchText(fullQuery);
  if (nameField.text.trim().startsWith(normalizedQuery)) total += 8;
  else if (nameField.text.includes(normalizedQuery)) total += 4;

  return total;
}

/** Matching exercises, best match first; ties keep the given order. */
export function rankExercises<T extends SearchableExercise>(
  exercises: readonly T[],
  query: string,
  limit = 50,
): T[] {
  const groups = buildTokenGroups(query);

  return exercises
    .map((exercise, index) => ({
      exercise,
      index,
      score: scoreExercise(exercise, groups, query),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ exercise }) => exercise);
}
