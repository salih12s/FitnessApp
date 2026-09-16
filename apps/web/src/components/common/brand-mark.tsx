import { Dumbbell } from 'lucide-react';

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5" aria-label="FitnessApp">
      <span className="grid size-9 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
        <Dumbbell aria-hidden="true" className="size-5" strokeWidth={2.25} />
      </span>
      <span className="text-base font-bold tracking-[-0.03em]">FitnessApp</span>
    </div>
  );
}
