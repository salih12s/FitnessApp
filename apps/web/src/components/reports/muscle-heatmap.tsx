import bodyBackUrl from '@/assets/muscles/body-back.svg';
import bodyFrontUrl from '@/assets/muscles/body-front.svg';
import { muscleRegions, type BodyView } from '@/data/muscle-regions';
import { formatWeightWithUnit } from '@/lib/format';
import { heatOpacity } from '@/lib/strength';
import type { MuscleGroupVolume } from '@/types/report';

const views: readonly [BodyView, string, string][] = [
  ['front', 'Ön', bodyFrontUrl],
  ['back', 'Arka', bodyBackUrl],
];

function BodyFigure({
  view,
  label,
  imageUrl,
  opacityBySlug,
}: {
  view: BodyView;
  label: string;
  imageUrl: string;
  opacityBySlug: Map<string, number>;
}) {
  return (
    <figure className="flex min-w-0 flex-col items-center">
      <svg
        aria-hidden="true"
        className="h-64 w-auto sm:h-72"
        preserveAspectRatio="xMidYMin meet"
        viewBox="10 8 180 352"
      >
        <image height="369" href={imageUrl} opacity="0.3" width="200" />
        {Object.entries(muscleRegions)
          .filter(([, region]) => region.view === view)
          .flatMap(([slug, region]) =>
            region.paths.map((path, index) => (
              <path
                d={path}
                fill="var(--primary)"
                key={`${slug}-${index}`}
                opacity={opacityBySlug.get(slug) ?? 0}
              />
            )),
          )}
      </svg>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

/**
 * Last-7-days volume per muscle group on the anatomy artwork. The list
 * repeats every value as text so the map never relies on color alone.
 */
export function MuscleHeatmap({
  muscleGroups,
}: {
  muscleGroups: MuscleGroupVolume[];
}) {
  const maxVolume = Math.max(
    0,
    ...muscleGroups.map((group) => Number(group.volumeKg)),
  );
  const opacityBySlug = new Map(
    muscleGroups.map((group) => [
      group.slug,
      heatOpacity(Number(group.volumeKg), maxVolume),
    ]),
  );
  const ranked = [...muscleGroups].sort(
    (a, b) =>
      Number(b.volumeKg) - Number(a.volumeKg) ||
      a.name.localeCompare(b.name, 'tr-TR'),
  );

  return (
    <div className="grid gap-4">
      <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
        {views.map(([view, label, imageUrl]) => (
          <BodyFigure
            imageUrl={imageUrl}
            key={view}
            label={label}
            opacityBySlug={opacityBySlug}
            view={view}
          />
        ))}
      </div>
      <ol className="grid gap-1">
        {ranked.map((group) => {
          const volume = Number(group.volumeKg);

          return (
            <li
              className="flex min-h-9 items-center gap-2.5 text-sm"
              key={group.slug}
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm bg-primary"
                style={{
                  opacity: Math.max(0.12, heatOpacity(volume, maxVolume)),
                }}
              />
              <span
                className={
                  volume > 0
                    ? 'min-w-0 flex-1 truncate text-foreground'
                    : 'min-w-0 flex-1 truncate text-muted-foreground'
                }
              >
                {group.name}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {volume > 0
                  ? `${group.setCount} set · ${formatWeightWithUnit(volume)}`
                  : 'çalışılmadı'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
