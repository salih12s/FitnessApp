import { useQuery } from '@tanstack/react-query';
import { Camera, PencilLine, Search } from 'lucide-react';
import { useState } from 'react';

import { getNutritionFeatures, nutritionKeys } from '@/api/nutrition';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/common/segmented-control';
import type { FoodDraft } from '@/lib/nutrition';
import type { FoodLibrary, Meal } from '@/types/nutrition';

import { FoodEntryForm } from './food-entry-form';
import { FoodSearch } from './food-search';
import { PhotoAnalyzer } from './photo-analyzer';

type Mode = 'manual' | 'search' | 'photo';

interface AddFoodPanelProps {
  date: string;
  meal: Meal;
  library?: FoodLibrary;
  onDone: () => void;
}

/** Where a new entry starts: typed by hand, found in the food database, or read from a photo. */
export function AddFoodPanel({
  date,
  meal,
  library,
  onDone,
}: AddFoodPanelProps) {
  const [mode, setMode] = useState<Mode>('manual');
  // Bumped when a search result fills the form, so the form starts over with it.
  const [draft, setDraft] = useState<{ value: FoodDraft; key: number } | null>(
    null,
  );

  const featuresQuery = useQuery({
    queryKey: nutritionKeys.features,
    queryFn: getNutritionFeatures,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const options: SegmentedOption<Mode>[] = [
    { value: 'manual', label: 'Elle gir', icon: PencilLine },
    { value: 'search', label: 'Ara', icon: Search },
    ...(featuresQuery.data?.photoAnalysis
      ? [{ value: 'photo' as const, label: 'Fotoğraf', icon: Camera }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <SegmentedControl
        label="Ekleme yöntemi"
        layoutId={`add-food-mode-${meal}`}
        onChange={setMode}
        options={options}
        value={mode}
      />

      {mode === 'manual' ? (
        <FoodEntryForm
          date={date}
          initialDraft={draft?.value}
          key={draft?.key ?? 0}
          library={library}
          meal={meal}
          onDone={onDone}
        />
      ) : null}

      {mode === 'search' ? (
        <FoodSearch
          onPick={(value) => {
            setDraft((current) => ({ value, key: (current?.key ?? 0) + 1 }));
            setMode('manual');
          }}
        />
      ) : null}

      {mode === 'photo' ? (
        <PhotoAnalyzer date={date} meal={meal} onDone={onDone} />
      ) : null}
    </div>
  );
}
