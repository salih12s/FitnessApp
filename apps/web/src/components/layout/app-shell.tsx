import * as m from 'motion/react-m';
import { Link, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/auth/use-auth';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { BrandMark } from '@/components/common/brand-mark';
import { UserBadge } from '@/components/common/user-badge';
import { DesktopNavigation } from '@/components/layout/desktop-navigation';
import { ActiveSessionBar } from '@/components/sessions/active-session-bar';
import { useActiveSession } from '@/components/sessions/use-active-session';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: activeSession } = useActiveSession();

  return (
    <div className="relative min-h-svh bg-background lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <DesktopNavigation />

      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg sm:px-8 lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            className="inline-flex rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
            to="/app"
          >
            <BrandMark />
          </Link>
          {user ? (
            <Link
              aria-label="Profil"
              className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
              to="/app/profile"
            >
              <UserBadge username={user.username} />
            </Link>
          ) : null}
        </div>
      </header>

      <main
        className={cn(
          'min-w-0 lg:pb-0',
          // Leave room for the fixed session bar above the bottom navigation.
          activeSession
            ? 'pb-[calc(11rem+env(safe-area-inset-bottom))]'
            : 'pb-[calc(6rem+env(safe-area-inset-bottom))]',
        )}
        id="main-content"
      >
        <ActiveSessionBar />
        {/* Keyed by path so each screen enters with the same short rise. */}
        <m.div
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12"
          initial={{ opacity: 0, y: 10 }}
          key={pathname}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </m.div>
      </main>

      <BottomNavigation />
    </div>
  );
}
