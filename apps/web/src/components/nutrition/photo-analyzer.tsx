import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  analyzeMealPhoto,
  createFoodEntries,
  nutritionKeys,
} from '@/api/nutrition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import {
  confidenceLabels,
  detectedToBatchItem,
  fitWithin,
  formatCalories,
  formatGrams,
} from '@/lib/nutrition';
import { cn } from '@/lib/utils';
import type { DetectedFood, Meal, PhotoAnalysis } from '@/types/nutrition';

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.85;

/** Shrinks a photo before upload: the model needs no more than this to see the food. */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
        'image/jpeg',
        JPEG_QUALITY,
      ),
    );
  } finally {
    bitmap.close();
  }
}

function analysisError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Bugünkü fotoğraf analizi sınırına ulaştın. Yarın yeniden deneyebilir ya da yiyecekleri elle ekleyebilirsin.';
    }
    if (error.status === 503) {
      return 'Fotoğraf analizi şu an kullanılamıyor. Biraz sonra yeniden dene.';
    }
    if (error.status === 422) {
      return 'Bu fotoğraf analiz edilemedi. Başka bir fotoğraf dene.';
    }
    if (error.status === 400 || error.status === 413 || error.status === 415) {
      return 'Fotoğraf kabul edilmedi. JPEG, PNG ya da WebP bir fotoğraf seç.';
    }
  }
  return 'Fotoğraf analiz edilemedi. Yeniden deneyebilirsin.';
}

interface Row extends DetectedFood {
  selected: boolean;
}

interface PhotoAnalyzerProps {
  date: string;
  meal: Meal;
  onDone: () => void;
}

/** Take or choose a meal photo, review what was found, and add it to the meal. */
export function PhotoAnalyzer({ date, meal, onDone }: PhotoAnalyzerProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const analyzeMutation = useMutation({
    mutationFn: async (file: File): Promise<PhotoAnalysis> => {
      let image: Blob;
      try {
        image = await prepareImage(file);
      } catch {
        throw new Error('unreadable');
      }
      return analyzeMealPhoto(image);
    },
    onSuccess: (result) => {
      setMessage(null);
      setNote(result.note);
      setRows(result.items.map((item) => ({ ...item, selected: true })));
    },
    onError: (error) => {
      setRows(null);
      setMessage(
        error instanceof Error && error.message === 'unreadable'
          ? 'Bu fotoğraf okunamadı. Başka bir fotoğraf dene.'
          : analysisError(error),
      );
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      createFoodEntries({
        eatenOn: date,
        meal,
        items: (rows ?? [])
          .filter((row) => row.selected && row.name.trim())
          .map(detectedToBatchItem),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
      onDone();
    },
    onError: () => setMessage('Yiyecekler eklenemedi. Yeniden deneyebilirsin.'),
  });

  function choose(file: File | undefined) {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setRows(null);
    setNote(null);
    setMessage(null);
    analyzeMutation.mutate(file);
  }

  function updateRow(index: number, changes: Partial<Row>) {
    setRows((current) =>
      (current ?? []).map((row, position) =>
        position === index ? { ...row, ...changes } : row,
      ),
    );
  }

  const selectedRows = (rows ?? []).filter((row) => row.selected);
  const total = selectedRows.reduce((sum, row) => sum + row.calories, 0);
  const isBusy = analyzeMutation.isPending || addMutation.isPending;

  return (
    <div className="space-y-4">
      <input
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = '';
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          variant={rows ? 'secondary' : 'primary'}
        >
          <Camera aria-hidden="true" className="size-4" />
          {rows ? 'Başka fotoğraf' : 'Fotoğraf çek veya seç'}
        </Button>
        {previewUrl ? (
          <img
            alt="Seçilen yemek fotoğrafı"
            className="size-16 rounded-md border border-border object-cover"
            src={previewUrl}
          />
        ) : null}
      </div>

      {analyzeMutation.isPending ? (
        <div className="space-y-2" role="status">
          <p className="text-sm text-muted-foreground">
            Yemek analiz ediliyor. Bu birkaç saniye sürebilir…
          </p>
          <div aria-hidden="true" className="skeleton h-14 rounded-md" />
          <div aria-hidden="true" className="skeleton h-14 rounded-md" />
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Fotoğrafta yiyecek bulunamadı.{note ? ` ${note}` : ''} Daha yakından
          ve iyi ışıkta bir fotoğraf deneyebilirsin.
        </p>
      ) : null}

      {rows && rows.length > 0 ? (
        <div className="space-y-3">
          <ul className="grid gap-2">
            {rows.map((row, index) => (
              <li
                className={cn(
                  'rounded-md border bg-surface p-3',
                  row.selected
                    ? 'border-border-strong'
                    : 'border-border opacity-60',
                )}
                key={`${row.name}-${index}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    aria-label={`${row.name} ekle`}
                    checked={row.selected}
                    className="mt-3 size-5 shrink-0 cursor-pointer accent-[var(--primary)]"
                    onChange={(event) =>
                      updateRow(index, { selected: event.target.checked })
                    }
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      aria-label="Yiyecek adı"
                      className="h-11 min-h-11 font-medium"
                      maxLength={120}
                      onChange={(event) =>
                        updateRow(index, { name: event.target.value })
                      }
                      value={row.name}
                    />
                    <p className="metric-number text-xs text-muted-foreground">
                      {row.servingLabel} · P {formatGrams(row.proteinG)} · K{' '}
                      {formatGrams(row.carbsG)} · Y {formatGrams(row.fatG)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {confidenceLabels[row.confidence]}
                    </p>
                  </div>
                  <label className="w-24 shrink-0">
                    <span className="sr-only">Kalori</span>
                    <span className="relative block">
                      <Input
                        className="metric-number h-11 min-h-11 px-3 pr-10 text-right text-base font-semibold"
                        inputMode="numeric"
                        onChange={(event) => {
                          const value = Number(
                            event.target.value.replace(/\D/g, ''),
                          );
                          updateRow(index, {
                            calories: Math.min(10_000, value),
                          });
                        }}
                        value={String(row.calories)}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-muted-foreground">
                        kcal
                      </span>
                    </span>
                  </label>
                </div>
              </li>
            ))}
          </ul>

          {note ? (
            <p className="text-sm text-muted-foreground">{note}</p>
          ) : null}

          <Button
            disabled={isBusy || selectedRows.length === 0}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending
              ? 'Ekleniyor…'
              : `Seçilenleri ekle (${selectedRows.length}) · ${formatCalories(total)} kcal`}
          </Button>
        </div>
      ) : null}

      <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Değerler bir yapay zeka tahminidir; porsiyon ve içerik farklıysa
          gerçek değerler yüzde 20-30 sapabilir. Kaydetmeden önce kontrol et ve
          düzelt. Fotoğraf yalnızca analiz için Anthropic&apos;in Claude
          servisine gönderilir; bu uygulamada saklanmaz.
        </span>
      </p>
    </div>
  );
}
