import * as m from 'motion/react-m';
import type { PropsWithChildren } from 'react';

import { AuthHeroFigure } from '@/components/auth/auth-hero-figure';
import { BrandMark } from '@/components/common/brand-mark';

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  description: string;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
      {/* The animated body is the stage; the sign-in card floats on top of it. */}
      <div className="absolute inset-0 -z-10">
        <AuthHeroFigure />
      </div>

      <header className="relative z-10">
        <BrandMark />
      </header>

      <div className="flex flex-1 items-center justify-center py-8">
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-xl border border-border-strong bg-surface/40 p-6 shadow-[0_24px_60px_-28px_var(--shadow-tint)] backdrop-blur-[3px] sm:p-8"
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.1, duration: 0.5, ease: easeOut }}
        >
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </m.div>
      </div>
    </main>
  );
}
