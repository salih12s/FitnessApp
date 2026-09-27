import * as m from 'motion/react-m';
import { Link, useLocation } from 'react-router';

import { useAuth } from '@/auth/use-auth';
import { BrandMark } from '@/components/common/brand-mark';
import { UserBadge } from '@/components/common/user-badge';
import {
  isNavigationItemActive,
  navigationItemsFor,
} from '@/components/layout/navigation-items';
import { cn } from '@/lib/utils';

export function DesktopNavigation() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-svh flex-col border-r border-border bg-surface-soft px-3 py-5 lg:flex">
      <Link
        className="mx-3 inline-flex rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
        to="/app"
      >
        <BrandMark />
      </Link>

      <nav aria-label="Ana navigasyon" className="mt-10 flex flex-col gap-1">
        {navigationItemsFor(Boolean(user?.isCoach)).map(
          ({ icon: Icon, label, to }) => {
            const isActive = isNavigationItemActive(pathname, to);

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring',
                  isActive
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-muted-foreground hover:bg-surface-strong/60 hover:text-foreground',
                )}
                key={to}
                to={to}
              >
                {isActive ? (
                  <m.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-md border border-border bg-surface shadow-[0_1px_2px_var(--shadow-tint)]"
                    layoutId="desktop-navigation-indicator"
                    transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  />
                ) : null}
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'relative size-4.5',
                    isActive && 'text-primary',
                  )}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span className="relative">{label}</span>
              </Link>
            );
          },
        )}
      </nav>

      {user ? (
        <Link
          className="mt-auto flex min-h-14 items-center gap-3 rounded-md px-3 outline-none transition-colors hover:bg-surface-strong/60 focus-visible:ring-3 focus-visible:ring-ring"
          to="/app/profile"
        >
          <UserBadge username={user.username} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {user.username}
            </span>
            <span className="block text-xs text-muted-foreground">
              Hesap ve ayarlar
            </span>
          </span>
        </Link>
      ) : null}
    </aside>
  );
}
