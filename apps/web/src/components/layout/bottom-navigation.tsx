import * as m from 'motion/react-m';
import { Link, useLocation } from 'react-router';

import {
  isNavigationItemActive,
  navigationItems,
} from '@/components/layout/navigation-items';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Ana navigasyon"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 px-1 sm:px-2">
        {navigationItems.map(({ icon: Icon, label, to }) => {
          const isActive = isNavigationItemActive(pathname, to);

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.6875rem] outline-none transition-[color,transform] duration-200 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring active:scale-95 sm:px-2 sm:text-xs',
                isActive
                  ? 'font-semibold text-primary'
                  : 'font-medium text-muted-foreground hover:text-foreground',
              )}
              key={to}
              to={to}
            >
              {isActive ? (
                <m.span
                  aria-hidden="true"
                  className="absolute inset-x-5 top-0 h-0.5 rounded-b-sm bg-primary"
                  layoutId="bottom-navigation-indicator"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                />
              ) : null}
              <Icon
                aria-hidden="true"
                className="size-5"
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
