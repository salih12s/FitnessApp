import bodyBackUrl from '@/assets/muscles/body-back.svg';
import bodyFrontUrl from '@/assets/muscles/body-front.svg';
import { muscleRegions, type BodyView } from '@/data/muscle-regions';
import { cn } from '@/lib/utils';

interface MuscleArtworkProps {
  slug: string;
  className?: string;
}

const bodyArtwork: Record<BodyView, string> = {
  front: bodyFrontUrl,
  back: bodyBackUrl,
};

export function MuscleArtwork({ slug, className }: MuscleArtworkProps) {
  const region = muscleRegions[slug] ?? muscleRegions.karin;

  return (
    <svg
      aria-hidden="true"
      className={cn('mask-b-from-55% mask-b-to-100%', className)}
      preserveAspectRatio="xMidYMin meet"
      viewBox={region.viewBox}
    >
      <image
        height="369"
        href={bodyArtwork[region.view]}
        opacity="0.3"
        width="200"
      />
      {region.paths.map((path, pathIndex) => (
        <path d={path} fill="var(--primary)" key={pathIndex} opacity="0.9" />
      ))}
    </svg>
  );
}
