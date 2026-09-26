import { Dumbbell } from 'lucide-react';

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5" aria-label="FitnessApp">
      <span className="grid size-8 place-items-center rounded-sm bg-primary text-primary-foreground">
        <Dumbbell aria-hidden="true" className="size-4.5" strokeWidth={2.25} />
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-[-0.02em]">
        FitnessApp
      </span>
    </div>
  );
}
