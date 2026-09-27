import type { LucideIcon } from 'lucide-react';
import * as m from 'motion/react-m';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  /** Unique per page; drives the sliding indicator. */
  layoutId: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  layoutId,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      aria-label={label}
      className={cn('grid rounded-md bg-surface-strong p-1', className)}
      role="radiogroup"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
        const isSelected = value === optionValue;

        return (
          <button
            aria-checked={isSelected}
            className={cn(
              'relative flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm px-3 text-sm outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
              isSelected
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground',
            )}
            disabled={disabled}
            key={optionValue}
            onClick={() => onChange(optionValue)}
            role="radio"
            type="button"
          >
            {isSelected ? (
              <m.span
                aria-hidden="true"
                className="absolute inset-0 rounded-sm bg-surface shadow-[0_1px_2px_var(--shadow-tint)]"
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              />
            ) : null}
            {Icon ? (
              <Icon aria-hidden="true" className="relative size-4" />
            ) : null}
            <span className="relative">{optionLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
