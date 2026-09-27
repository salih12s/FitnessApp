import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { exerciseKeys, searchExercises } from '@/api/exercises';
import { getReportExercises, reportKeys } from '@/api/reports';
import { ExerciseListItem } from '@/components/common/exercise-list-item';
import { SectionHeading } from '@/components/common/section-heading';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useClientScope } from '@/lib/client-scope';

/**
 * Picks the exercise a coach logs for a client: the client's recently
 * trained exercises first, or a search of the client's library.
 */
export function ClientLogPage() {
  const clientId = useClientScope()?.clientId;
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 250);
  const recentQuery = useQuery({
    queryKey: reportKeys.exercises,
    queryFn: () => getReportExercises(clientId),
    retry: 1,
  });
  const searchQuery = useQuery({
    queryKey: exerciseKeys.search(debounced),
    queryFn: () => searchExercises(debounced, clientId),
    enabled: debounced.length >= 2,
    retry: 1,
  });
  const isSearching = trimmed.length >= 2;
  const recent = recentQuery.data?.slice(0, 8) ?? [];

  return (
    <div className="mt-4">
      <label className="sr-only" htmlFor="client-exercise-search">
        Hareket ara
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoComplete="off"
          className="pl-11"
          id="client-exercise-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hareket ara, örneğin squat"
          type="search"
          value={query}
        />
      </div>

      {isSearching ? (
        <section aria-live="polite" className="mt-5">
          {searchQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Arama yapılamadı. Yeniden deneyebilirsin.
            </p>
          ) : debounced !== trimmed || searchQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Aranıyor…</p>
          ) : searchQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              &ldquo;{trimmed}&rdquo; için hareket bulunamadı.
            </p>
          ) : (
            <div className="grid gap-2">
              {searchQuery.data.slice(0, 12).map((exercise, index) => (
                <ExerciseListItem
                  exercise={exercise}
                  index={index}
                  key={exercise.id}
                  lastPerformedAt={
                    recentQuery.data?.find((item) => item.id === exercise.id)
                      ?.latestPerformedAt
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section aria-labelledby="client-recent-title" className="mt-6">
          <SectionHeading
            description="Danışanın en son çalıştığı hareketler. Başka bir hareket için arama yap."
            id="client-recent-title"
            title="Son çalışılanlar"
          />
          {recentQuery.isPending ? (
            <div aria-hidden="true" className="mt-3 grid gap-2">
              <div className="skeleton h-18 rounded-lg" />
              <div className="skeleton h-18 rounded-lg" />
            </div>
          ) : recent.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {recent.map((exercise, index) => (
                <ExerciseListItem
                  exercise={{ ...exercise, equipment: null }}
                  index={index}
                  key={exercise.id}
                  lastPerformedAt={exercise.latestPerformedAt}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md bg-surface-strong px-3 py-4 text-center text-sm text-muted-foreground">
              Danışanın henüz kaydı yok. Yukarıdan bir hareket arayarak
              başlayabilirsin.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
