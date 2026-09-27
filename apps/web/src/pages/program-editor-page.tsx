import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

import { exerciseKeys, searchExercises } from '@/api/exercises';
import {
  createTemplate,
  getTemplates,
  templateKeys,
  updateTemplate,
} from '@/api/templates';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ApiError } from '@/lib/api';
import { getWeightUnit, toWeightInput } from '@/lib/format';
import {
  toTargetWeight,
  validateTemplateRow,
  type TemplateRowDraft,
  type TemplateRowErrors,
} from '@/lib/template-form';
import { cn } from '@/lib/utils';
import { toggleWeekday, WEEKDAYS } from '@/lib/weekdays';
import type { TemplateExercise, WorkoutTemplate } from '@/types/template';

interface RowState extends TemplateRowDraft {
  key: number;
  exercise: TemplateExercise['exercise'];
}

function ExercisePicker({
  onPick,
  excludedIds,
}: {
  onPick: (exercise: TemplateExercise['exercise']) => void;
  excludedIds: Set<string>;
}) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 250);
  const resultsQuery = useQuery({
    queryKey: exerciseKeys.search(debounced),
    queryFn: () => searchExercises(debounced),
    enabled: debounced.length >= 2,
    retry: 1,
  });
  const results = (resultsQuery.data ?? [])
    .filter((exercise) => !excludedIds.has(exercise.id))
    .slice(0, 6);

  return (
    <div>
      <label
        className="text-sm font-medium text-foreground"
        htmlFor="program-exercise-search"
      >
        Hareket ekle
      </label>
      <div className="relative mt-1.5">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoComplete="off"
          className="pl-11"
          id="program-exercise-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hareket ara, örneğin squat"
          type="search"
          value={query}
        />
      </div>
      {trimmed.length >= 2 &&
      debounced === trimmed &&
      resultsQuery.isSuccess ? (
        results.length > 0 ? (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
            {results.map((exercise) => (
              <li key={exercise.id}>
                <button
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3 text-left outline-none transition-colors hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => {
                    onPick({
                      id: exercise.id,
                      name: exercise.name,
                      slug: exercise.slug,
                      isCustom: exercise.isCustom,
                      muscleGroup: exercise.muscleGroup,
                    });
                    setQuery('');
                  }}
                  type="button"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {exercise.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {exercise.muscleGroup.name}
                    </span>
                  </span>
                  <Plus
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            “{trimmed}” için eklenebilecek hareket bulunamadı.
          </p>
        )
      ) : null}
    </div>
  );
}

function ProgramForm({ template }: { template?: WorkoutTemplate }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nextKey = useRef((template?.exercises.length ?? 0) + 1);
  const [name, setName] = useState(template?.name ?? '');
  const [days, setDays] = useState(template?.scheduledDays ?? 0);
  const [rows, setRows] = useState<RowState[]>(
    () =>
      template?.exercises.map((row, index) => ({
        key: index + 1,
        exercise: row.exercise,
        targetSets: String(row.targetSets),
        targetReps: String(row.targetReps),
        targetWeight: row.targetWeightKg
          ? toWeightInput(row.targetWeightKg).replace('.', ',')
          : '',
      })) ?? [],
  );
  const [rowErrors, setRowErrors] = useState<Record<number, TemplateRowErrors>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const input = {
        name: name.trim(),
        scheduledDays: days,
        exercises: rows.map((row) => ({
          exerciseId: row.exercise.id,
          targetSets: Number(row.targetSets),
          targetReps: Number(row.targetReps),
          targetWeightKg: toTargetWeight(row.targetWeight),
        })),
      };
      return template
        ? updateTemplate(template.id, input)
        : createTemplate(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: templateKeys.all });
      navigate('/app/programs');
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError && error.status === 400
          ? 'Program bilgilerini kontrol edip tekrar dene.'
          : 'Program kaydedilemedi. Bağlantını kontrol edip tekrar dene.',
      ),
  });

  function updateRow(
    key: number,
    field: keyof TemplateRowDraft,
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
    setRowErrors((current) => ({
      ...current,
      [key]: { ...current[key], [field]: undefined },
    }));
  }

  function moveRow(index: number, delta: number) {
    setRows((current) => {
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const errors = Object.fromEntries(
      rows
        .map((row) => [row.key, validateTemplateRow(row)] as const)
        .filter(([, rowError]) => Object.keys(rowError).length > 0),
    );
    setRowErrors(errors);

    if (!name.trim()) {
      setFormError('Programa bir ad ver.');
      return;
    }
    if (rows.length === 0) {
      setFormError('En az bir hareket ekle.');
      return;
    }
    if (Object.keys(errors).length > 0) {
      return;
    }

    mutation.mutate();
  }

  return (
    <form className="mt-6 max-w-2xl space-y-4" noValidate onSubmit={submit}>
      <section className="space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="program-name"
          >
            Program adı
          </label>
          <Input
            autoComplete="off"
            className="mt-1.5"
            id="program-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Örneğin İtiş günü"
            value={name}
          />
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            Planlanan günler{' '}
            <span className="font-normal text-muted-foreground">
              (takvimde görünür)
            </span>
          </legend>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => {
              const isOn = (days & day.bit) !== 0;
              return (
                <button
                  aria-label={day.long}
                  aria-pressed={isOn}
                  className={cn(
                    'min-h-11 cursor-pointer rounded-md border text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring',
                    isOn
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border-strong bg-surface text-muted-foreground hover:text-foreground',
                  )}
                  key={day.bit}
                  onClick={() =>
                    setDays((current) => toggleWeekday(current, day.bit))
                  }
                  type="button"
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section
        aria-labelledby="program-exercises-title"
        className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <h2
          className="text-base font-semibold text-foreground"
          id="program-exercises-title"
        >
          Hareketler
        </h2>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aşağıdan arayarak programa hareket ekle.
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, index) => {
              const errors = rowErrors[row.key] ?? {};
              const message =
                errors.targetSets ?? errors.targetReps ?? errors.targetWeight;

              return (
                <li
                  className="rounded-md border border-border bg-surface-elevated p-3"
                  key={row.key}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {row.exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.exercise.muscleGroup.name}
                      </p>
                    </div>
                    <div className="-mr-1 -mt-1 flex shrink-0">
                      <Button
                        aria-label={`${row.exercise.name} yukarı taşı`}
                        className="size-10 min-h-10 text-muted-foreground"
                        disabled={index === 0}
                        onClick={() => moveRow(index, -1)}
                        size="icon"
                        variant="ghost"
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        aria-label={`${row.exercise.name} aşağı taşı`}
                        className="size-10 min-h-10 text-muted-foreground"
                        disabled={index === rows.length - 1}
                        onClick={() => moveRow(index, 1)}
                        size="icon"
                        variant="ghost"
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        aria-label={`${row.exercise.name} programdan çıkar`}
                        className="size-10 min-h-10 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setRows((current) =>
                            current.filter((item) => item.key !== row.key),
                          )
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        ['targetSets', 'Set', 'numeric', '3'],
                        ['targetReps', 'Tekrar', 'numeric', '8'],
                        [
                          'targetWeight',
                          `${getWeightUnit() === 'kg' ? 'Kg' : 'Lb'} (isteğe bağlı)`,
                          'decimal',
                          '-',
                        ],
                      ] as const
                    ).map(([field, label, inputMode, placeholder]) => (
                      <label className="min-w-0" key={field}>
                        <span className="block truncate text-[0.6875rem] text-muted-foreground">
                          {label}
                        </span>
                        <Input
                          aria-invalid={Boolean(errors[field])}
                          className="metric-number mt-1 h-11 min-h-11 px-3 text-base font-semibold"
                          inputMode={inputMode}
                          onChange={(event) =>
                            updateRow(row.key, field, event.target.value)
                          }
                          placeholder={placeholder}
                          value={row[field]}
                        />
                      </label>
                    ))}
                  </div>
                  {message ? (
                    <p className="mt-1.5 text-xs text-destructive" role="alert">
                      {message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        <ExercisePicker
          excludedIds={new Set(rows.map((row) => row.exercise.id))}
          onPick={(exercise) =>
            setRows((current) => [
              ...current,
              {
                key: nextKey.current++,
                exercise,
                targetSets: '3',
                targetReps: '8',
                targetWeight: '',
              },
            ])
          }
        />
      </section>

      {formError ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      <Button
        className="w-full sm:w-auto"
        disabled={mutation.isPending}
        size="lg"
        type="submit"
      >
        <Save aria-hidden="true" className="size-4" />
        {mutation.isPending ? 'Kaydediliyor…' : 'Programı kaydet'}
      </Button>
    </form>
  );
}

export function ProgramEditorPage() {
  const { id } = useParams();
  const templatesQuery = useQuery({
    queryKey: templateKeys.all,
    queryFn: getTemplates,
    enabled: Boolean(id),
    retry: 1,
  });
  const template = id
    ? templatesQuery.data?.find((item) => item.id === id)
    : undefined;

  if (id && templatesQuery.isSuccess && !template) {
    return <Navigate replace to="/app/programs" />;
  }

  return (
    <div>
      <Link
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        to="/app/programs"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Programlara dön
      </Link>
      <PageHeader
        className="mt-4"
        description="Hareketleri sırayla ekle, her biri için set ve tekrar hedefi gir."
        title={id ? 'Programı düzenle' : 'Yeni program'}
      />

      {id && templatesQuery.isPending ? (
        <div
          aria-label="Program yükleniyor"
          className="skeleton mt-6 h-64 max-w-2xl rounded-lg border border-border"
          role="status"
        />
      ) : null}
      {id && templatesQuery.isError ? (
        <div className="mt-6 max-w-2xl">
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Program bilgisi alınamadı."
            icon={AlertTriangle}
            isActionPending={templatesQuery.isFetching}
            onAction={() => void templatesQuery.refetch()}
            title="Program yüklenemedi"
          />
        </div>
      ) : null}

      {!id ? <ProgramForm /> : null}
      {template ? <ProgramForm key={template.id} template={template} /> : null}
    </div>
  );
}
