import { Outlet } from 'react-router';

import { BrandMark } from '@/components/common/brand-mark';

export function AppShell() {
  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-primary/35"
      />
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
        <BrandMark />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
