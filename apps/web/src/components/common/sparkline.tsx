import { useId } from 'react';

import { cn } from '@/lib/utils';

interface SparklineProps {
  values: number[];
  className?: string;
}

const width = 240;
const height = 56;
const padding = 4;

/** Compact trend line; the latest value is marked with a dot. */
export function Sparkline({ values, className }: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index: number) =>
    padding + (index * (width - padding * 2)) / (values.length - 1);
  const y = (value: number) =>
    height - padding - ((value - min) / span) * (height - padding * 2);
  const line = values
    .map((value, index) => `${x(index)},${y(value)}`)
    .join(' ');
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <div aria-hidden="true" className={cn('relative h-14 w-full', className)}>
      <svg
        className="block size-full overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          fill={`url(#${gradientId})`}
          points={`${x(0)},${height} ${line} ${lastX},${height}`}
        />
        <polyline
          fill="none"
          points={line}
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* An HTML dot stays round while the SVG stretches to its container. */}
      <span
        className="absolute size-2 -translate-1/2 rounded-full bg-primary ring-3 ring-surface"
        style={{
          left: `${(lastX / width) * 100}%`,
          top: `${(lastY / height) * 100}%`,
        }}
      />
    </div>
  );
}
