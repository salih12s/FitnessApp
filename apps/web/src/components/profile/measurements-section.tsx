import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  createMeasurement,
  deleteMeasurement,
  getMeasurements,
  measurementKeys,
} from '@/api/measurements';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { formatWeight, getWeightUnit } from '@/lib/format';
import { toDateKey } from '@/lib/history-groups';
import {
  emptyMeasurementDraft,
  latestMeasurementValues,
  parseCalendarDate,
  toMeasurementInput,
  validateMeasurement,
  type MeasurementDraft,
  type MeasurementErrors,
  type MeasurementMetric,
} from '@/lib/measurement-form';
import type { BodyMeasurement } from '@/types/measurement';

import { BodyWeightChart } from './body-weight-chart';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const decimalFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 1,
});

const metrics: readonly [MeasurementMetric, string][] = [
  ['weightKg', 'Kilo'],
  ['bodyFatPercent', 'Yağ oranı'],
  ['waistCm', 'Bel'],
  ['chestCm', 'Göğüs'],
  ['armCm', 'Kol'],
];

function metricUnit(metric: MeasurementMetric): string {
  if (metric === 'weightKg') return getWeightUnit();
  return metric === 'bodyFatPercent' ? '%' : 'cm';
}

function formatMetric(metric: MeasurementMetric, value: string): string {
  return metric === 'weightKg'
    ? formatWeight(value)
    : decimalFormatter.format(Number(value));
}

function MeasurementForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MeasurementDraft>(() =>
    emptyMeasurementDraft(toDateKey(new Date())),
  );
  const [errors, setErrors] = useState<MeasurementErrors>({});
  const mutation = useMutation({
    mutationFn: () => createMeasurement(toMeasurementInput(draft)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: measurementKeys.all });
      onDone();
    },
    onError: (error) =>
      setErrors({
        form:
          error instanceof ApiError && error.status === 400
            ? 'Ölçüm kaydedilemedi. Değerleri kontrol et.'
            : 'Ölçüm kaydedilemedi. Yeniden deneyebilirsin.',
      }),
  });

  function update(field: keyof MeasurementDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMeasurement(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).every((message) => !message)) {
      mutation.mutate();
    }
  }

  const fields: readonly [
    Exclude<keyof MeasurementDraft, 'measuredAt' | 'note'>,
    string,
    string,
  ][] = [
    ['weight', 'Kilo', getWeightUnit()],
    ['bodyFatPercent', 'Yağ oranı', '%'],
    ['waistCm', 'Bel', 'cm'],
    ['chestCm', 'Göğüs', 'cm'],
    ['armCm', 'Kol', 'cm'],
  ];
  const fieldError = fields
    .map(([field]) => errors[field])
    .find((message) => message);

  return (
    <form
      className="mt-4 rounded-md border border-border bg-surface-elevated p-3 sm:p-4"
      noValidate
      onSubmit={submit}
    >
      <label className="block text-sm font-medium text-foreground">
        Tarih
        <Input
          aria-invalid={Boolean(errors.measuredAt)}
          className="metric-number mt-1.5"
          max={toDateKey(new Date())}
          onChange={(event) => update('measuredAt', event.target.value)}
          required
          type="date"
          value={draft.measuredAt}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {fields.map(([field, label, unit]) => (
          <label className="min-w-0" key={field}>
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className="relative mt-1 block">
              <Input
                aria-invalid={Boolean(errors[field])}
                className="metric-number h-11 min-h-11 px-3 pr-9 text-base font-semibold"
                inputMode="decimal"
                onChange={(event) => update(field, event.target.value)}
                placeholder="-"
                value={draft[field]}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
              </span>
            </span>
          </label>
        ))}
      </div>
      <label className="mt-3 block text-sm font-medium text-foreground">
        Not{' '}
        <span className="font-normal text-muted-foreground">
          (isteğe bağlı)
        </span>
        <Input
          aria-invalid={Boolean(errors.note)}
          className="mt-1.5"
          maxLength={1000}
          onChange={(event) => update('note', event.target.value)}
          placeholder="Örneğin sabah aç karnına"
          value={draft.note}
        />
      </label>
      {fieldError || errors.measuredAt || errors.note || errors.form ? (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          {fieldError ?? errors.measuredAt ?? errors.note ?? errors.form}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button
          disabled={mutation.isPending}
          onClick={onDone}
          variant="secondary"
        >
          Vazgeç
        </Button>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Kaydediliyor' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}

function MeasurementRow({ measurement }: { measurement: BodyMeasurement }) {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => deleteMeasurement(measurement.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: measurementKeys.all }),
  });
  const date = dateFormatter.format(parseCalendarDate(measurement.measuredAt));
  const values = metrics.filter(([metric]) => measurement[metric] !== null);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{date}</p>
          <p className="metric-number mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {values.map(([metric, label]) => (
              <span key={metric}>
                {label}{' '}
                <span className="font-semibold text-foreground">
                  {metric === 'bodyFatPercent' ? '%' : ''}
                  {formatMetric(metric, measurement[metric] ?? '')}
                  {metric === 'bodyFatPercent' ? '' : ` ${metricUnit(metric)}`}
                </span>
              </span>
            ))}
          </p>
          {measurement.note ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {measurement.note}
            </p>
          ) : null}
        </div>
        {isConfirming ? null : (
          <Button
            aria-label={`${date} ölçümünü sil`}
            className="-mr-2 -mt-2 size-11 min-h-11 text-muted-foreground hover:text-destructive"
            onClick={() => setIsConfirming(true)}
            size="icon"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
      {isConfirming ? (
        <div
          aria-live="polite"
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            Bu ölçüm silinsin mi?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Bu işlem geri alınamaz.
          </p>
          {mutation.isError ? (
            <p className="mt-2 text-sm font-medium text-destructive">
              Ölçüm silinemedi. Yeniden deneyebilirsin.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => setIsConfirming(false)}
              variant="secondary"
            >
              Vazgeç
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {mutation.isPending ? 'Siliniyor' : 'Sil'}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function MeasurementsSection() {
  const [isAdding, setIsAdding] = useState(false);
  const query = useQuery({
    queryKey: measurementKeys.all,
    queryFn: getMeasurements,
  });
  const measurements = query.data ?? [];
  const latest = latestMeasurementValues(measurements);

  return (
    <section
      aria-labelledby="measurements-title"
      className="animate-rise mt-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      style={{ '--i': 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <SectionHeading
          description="Kilonu ve çevre ölçülerini takip et."
          id="measurements-title"
          title="Vücut ölçümleri"
        />
        {isAdding ? null : (
          <Button
            className="shrink-0 px-4"
            onClick={() => setIsAdding(true)}
            variant="secondary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Ekle
          </Button>
        )}
      </div>

      {isAdding ? <MeasurementForm onDone={() => setIsAdding(false)} /> : null}

      {query.isPending ? (
        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="skeleton h-16 rounded-md" />
          <div className="skeleton h-48 rounded-md" />
        </div>
      ) : query.isError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-strong px-3 py-3">
          <p className="text-sm text-muted-foreground" role="alert">
            Ölçümlerin şu an yüklenemedi.
          </p>
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            variant="secondary"
          >
            Tekrar dene
          </Button>
        </div>
      ) : measurements.length === 0 ? (
        isAdding ? null : (
          <p className="mt-4 rounded-md bg-surface-strong px-3 py-4 text-center text-sm text-muted-foreground">
            Henüz ölçüm yok. İlk tartını ekleyerek başla.
          </p>
        )
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {metrics.map(([metric, label]) => {
              const value = latest[metric];
              return (
                <div
                  className="rounded-md bg-surface-strong px-3 py-2.5"
                  key={metric}
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="metric-number mt-0.5 text-lg font-semibold text-foreground">
                    {value !== null && metric === 'bodyFatPercent' ? (
                      <span className="mr-0.5 text-xs font-normal text-muted-foreground">
                        %
                      </span>
                    ) : null}
                    {value === null ? '-' : formatMetric(metric, value)}
                    {value === null || metric === 'bodyFatPercent' ? null : (
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                        {metricUnit(metric)}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="mt-4">
            <BodyWeightChart measurements={measurements} />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-foreground">
            Geçmiş ölçümler
          </h3>
          <ul className="mt-3 divide-y divide-border">
            {measurements.map((measurement) => (
              <MeasurementRow key={measurement.id} measurement={measurement} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
