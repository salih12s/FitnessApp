import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useState } from 'react';

import bodyFrontUrl from '@/assets/muscles/body-front.svg';
import { muscleRegions } from '@/data/muscle-regions';

// Front-view regions shown in turn to preview the muscle-group library.
const featuredMuscles = [
  ['gogus', 'Göğüs'],
  ['omuz', 'Omuz'],
  ['biceps', 'Biceps'],
  ['karin', 'Karın'],
  ['on-kol', 'Ön kol'],
  ['bacak', 'Bacak'],
] as const;

export function AuthHeroFigure() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [, activeName] = featuredMuscles[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % featuredMuscles.length),
      1800,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <m.svg
        animate={{ opacity: 1, scale: 1 }}
        className="absolute left-1/2 top-[-4%] h-[116%] w-auto -translate-x-1/2"
        initial={{ opacity: 0, scale: 0.96 }}
        preserveAspectRatio="xMidYMin meet"
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewBox="15 12 170 290"
      >
        <image height="369" href={bodyFrontUrl} opacity="0.34" width="200" />
        {featuredMuscles.map(([slug], index) => (
          <m.g
            animate={{ opacity: index === activeIndex ? 0.9 : 0 }}
            initial={false}
            key={slug}
            transition={{ duration: 0.6 }}
          >
            {muscleRegions[slug].paths.map((path, pathIndex) => (
              <path d={path} fill="var(--primary)" key={pathIndex} />
            ))}
          </m.g>
        ))}
      </m.svg>

      <div className="absolute left-1/2 top-[max(1.25rem,env(safe-area-inset-top))] -translate-x-1/2">
        <AnimatePresence initial={false} mode="wait">
          <m.span
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_4px_12px_-6px_var(--shadow-tint)]"
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: 6 }}
            key={activeName}
            transition={{ duration: 0.25 }}
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {activeName}
          </m.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
