import { LazyMotion, MotionConfig } from 'motion/react';
import type { PropsWithChildren } from 'react';

const loadFeatures = () =>
  import('./motion-features').then((module) => module.default);

/**
 * Loads Motion's feature set on demand for the `m` components and makes every
 * animation respect the user's reduced-motion preference.
 */
export function MotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
