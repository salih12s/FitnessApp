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
    <main className="min-h-svh bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(28rem,1fr)]">
      <section className="relative hidden overflow-hidden border-r border-border bg-surface-soft p-10 lg:flex lg:flex-col xl:p-14">
        <BrandMark />
        <div className="mt-16 max-w-md">
          <p className="animate-rise text-4xl font-semibold leading-[1.1] tracking-[-0.035em] text-foreground xl:text-5xl">
            Setlerini kaydet.
            <br />
            <span className="text-muted-foreground">Gelişimini gör.</span>
          </p>
          <p
            className="animate-rise mt-5 max-w-sm text-[0.9375rem] leading-6 text-muted-foreground"
            style={{ '--i': 1 }}
          >
            Her hareket için ağırlık ve tekrar geçmişin, rekorların ve ilerleme
            grafiğin tek yerde.
          </p>
        </div>
        <div className="relative mt-auto h-[46svh] min-h-72">
          <AuthHeroFigure />
        </div>
      </section>

      <section className="flex min-h-svh min-w-0 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:justify-center lg:px-16 lg:py-10">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        <div
          aria-hidden="true"
          className="relative mx-auto my-4 h-52 w-full max-w-xs sm:h-60 lg:hidden"
        >
          <AuthHeroFigure />
        </div>

        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.1, duration: 0.5, ease: easeOut }}
        >
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </m.div>
      </section>
    </main>
  );
}
