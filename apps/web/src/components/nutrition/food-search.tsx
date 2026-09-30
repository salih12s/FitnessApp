import { useQuery } from '@tanstack/react-query';
import { PackageSearch, Search } from 'lucide-react';
import { useState } from 'react';

import {
  nutritionKeys,
  searchCatalog,
  searchPackagedFoods,
} from '@/api/nutrition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  draftFromCatalogFood,
  formatCalories,
  formatGrams,
  parseGrams,
  scaleToGrams,
  type FoodDraft,
} from '@/lib/nutrition';
import { cn } from '@/lib/utils';
import type { CatalogFood } from '@/types/nutrition';

interface FoodSearchProps {
  /** Called with the entry form filled from the chosen food and amount. */
  onPick: (draft: FoodDraft) => void;
}

function FoodRow({
  food,
  isSelected,
  onSelect,
}: {
  food: CatalogFood;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring',
        isSelected
          ? 'border-primary bg-surface'
          : 'border-border bg-surface hover:bg-surface-elevated',
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {food.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {food.brand ?? food.category ?? ''}
        </span>
      </span>
      <span className="metric-number shrink-0 text-right text-xs text-muted-foreground">
        <span className="text-sm font-semibold text-foreground">
          {formatCalories(food.per100g.calories)}
        </span>{' '}
        kcal / 100 g
      </span>
    </button>
  );
}

function AmountPicker({
  food,
  onPick,
}: {
  food: CatalogFood;
  onPick: (draft: FoodDraft) => void;
}) {
  const [amount, setAmount] = useState(String(food.servingGrams));
  const grams = parseGrams(amount);
  const scaled = grams ? scaleToGrams(food.per100g, grams) : null;

  return (
    <div className="space-y-3 rounded-md border border-primary bg-surface p-3 sm:p-4">
      <p className="text-sm font-semibold text-foreground">{food.name}</p>

      <label className="block text-xs text-muted-foreground">
        Miktar
        <span className="relative mt-1 block">
          <Input
            aria-invalid={grams === null}
            autoFocus
            className="metric-number h-11 min-h-11 pr-9 text-base font-semibold"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            value={amount}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
            g
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        {[
          { label: '100 g', grams: 100 },
          { label: food.servingLabel, grams: food.servingGrams },
        ].map((option) => (
          <button
            className="min-h-9 cursor-pointer rounded-sm border border-border-strong bg-surface px-2.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-ring"
            key={option.label}
            onClick={() => setAmount(String(option.grams))}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="metric-number text-sm text-foreground" role="status">
        {scaled ? (
          <>
            <span className="font-semibold">
              {formatCalories(scaled.calories)} kcal
            </span>
            <span className="text-muted-foreground">
              {' '}
              · P {formatGrams(scaled.proteinG)} · K{' '}
              {formatGrams(scaled.carbsG)} · Y {formatGrams(scaled.fatG)}
            </span>
          </>
        ) : (
          <span className="text-destructive">
            1 ile 5000 arasında bir gram değeri gir.
          </span>
        )}
      </p>

      <Button
        disabled={!grams}
        onClick={() => grams && onPick(draftFromCatalogFood(food, grams))}
      >
        Forma aktar
      </Button>
    </div>
  );
}

/** Search the built-in catalog (and, on request, packaged products) and pick an amount. */
export function FoodSearch({ onPick }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [packagedQuery, setPackagedQuery] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 250);
  const isActive = debounced.length >= 2;

  const catalogQuery = useQuery({
    queryKey: nutritionKeys.catalog(debounced),
    queryFn: () => searchCatalog(debounced),
    enabled: isActive,
    retry: 1,
  });
  const packagedResults = useQuery({
    queryKey: nutritionKeys.packaged(packagedQuery ?? ''),
    queryFn: () => searchPackagedFoods(packagedQuery ?? ''),
    enabled: packagedQuery !== null,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const catalog = isActive ? (catalogQuery.data ?? []) : [];
  const packaged =
    packagedQuery !== null && packagedQuery === debounced
      ? (packagedResults.data ?? [])
      : [];
  const selected = [...catalog, ...packaged].find(
    (food) => food.id === selectedId,
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="sr-only" htmlFor="food-search">
          Besin ara
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoComplete="off"
          className="h-12 pl-11"
          id="food-search"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId(null);
          }}
          placeholder="Besin ara: tavuk, pilav, yoğurt…"
          type="search"
          value={query}
        />
      </div>

      {selected ? (
        <AmountPicker food={selected} key={selected.id} onPick={onPick} />
      ) : null}

      {isActive && catalogQuery.isPending ? (
        <div aria-hidden="true" className="skeleton h-14 rounded-md" />
      ) : null}

      {isActive && catalogQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Arama yapılamadı. Yeniden deneyebilirsin.
        </p>
      ) : null}

      {catalog.length > 0 ? (
        <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1">
          {catalog.map((food) => (
            <li key={food.id}>
              <FoodRow
                food={food}
                isSelected={food.id === selectedId}
                onSelect={() => setSelectedId(food.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {isActive && catalogQuery.isSuccess && catalog.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          “{debounced}” için listede yiyecek bulunamadı. Paketli ürünlerde
          arayabilir ya da değerleri elle girebilirsin.
        </p>
      ) : null}

      {isActive && catalogQuery.isSuccess ? (
        <div className="space-y-2 border-t border-border pt-3">
          {packagedQuery !== debounced ? (
            <Button
              className="h-10 min-h-10 px-3 text-xs"
              onClick={() => setPackagedQuery(debounced)}
              variant="secondary"
            >
              <PackageSearch aria-hidden="true" className="size-4" />
              Paketli ürünlerde ara
            </Button>
          ) : null}

          {packagedQuery === debounced && packagedResults.isPending ? (
            <p className="text-sm text-muted-foreground" role="status">
              Paketli ürünler aranıyor…
            </p>
          ) : null}

          {packagedQuery === debounced && packagedResults.isError ? (
            <p className="text-sm text-muted-foreground" role="alert">
              Paketli ürün servisine şu an ulaşılamadı. Biraz sonra yeniden
              deneyebilirsin.
            </p>
          ) : null}

          {packagedQuery === debounced &&
          packagedResults.isSuccess &&
          packaged.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Paketli ürünlerde eşleşme bulunamadı.
            </p>
          ) : null}

          {packaged.length > 0 ? (
            <>
              <p className="text-xs font-medium text-muted-foreground">
                Paketli ürünler
              </p>
              <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                {packaged.map((food) => (
                  <li key={food.id}>
                    <FoodRow
                      food={food}
                      isSelected={food.id === selectedId}
                      onSelect={() => setSelectedId(food.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">
        Yiyecek listesi USDA FoodData Central verisine dayanır (kamu malı).
        Paketli ürün verileri Open Food Facts topluluğundan gelir (ODbL) ve
        hatalı olabilir; önemli bir değer için ambalajı kontrol et.
      </p>
    </div>
  );
}
