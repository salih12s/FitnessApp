import { useState } from 'react';
import { LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import * as m from 'motion/react-m';

import { getAuthErrorMessage } from '@/auth/auth-api';
import { useAuth } from '@/auth/use-auth';
import { PageHeader } from '@/components/common/page-header';
import { UserBadge } from '@/components/common/user-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme';

const themeOptions: readonly [ThemePreference, string, LucideIcon][] = [
  ['system', 'Sistem', Monitor],
  ['light', 'Açık', Sun],
  ['dark', 'Koyu', Moon],
];

function ThemeSelector() {
  const [preference, setPreference] = useState(getThemePreference);

  function choose(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    setThemePreference(nextPreference);
  }

  return (
    <div
      aria-label="Tema"
      className="grid grid-cols-3 rounded-md bg-surface-strong p-1"
      role="radiogroup"
    >
      {themeOptions.map(([value, label, Icon]) => {
        const isSelected = preference === value;

        return (
          <button
            aria-checked={isSelected}
            className={cn(
              'relative flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm px-3 text-sm outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring',
              isSelected
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground',
            )}
            key={value}
            onClick={() => choose(value)}
            role="radio"
            type="button"
          >
            {isSelected ? (
              <m.span
                aria-hidden="true"
                className="absolute inset-0 rounded-sm bg-surface shadow-[0_1px_2px_var(--shadow-tint)]"
                layoutId="theme-indicator"
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              />
            ) : null}
            <Icon aria-hidden="true" className="relative size-4" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ProfilePage() {
  const { logout, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setError(null);
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (logoutError: unknown) {
      setError(getAuthErrorMessage(logoutError));
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        description="Hesap bilgilerini ve görünüm tercihini yönet."
        title="Profil"
      />

      <section
        aria-labelledby="account-title"
        className="animate-rise mt-6 rounded-lg border border-border bg-surface p-4 sm:p-5"
        style={{ '--i': 2 }}
      >
        <h2 className="sr-only" id="account-title">
          Hesap
        </h2>
        <div className="flex items-center gap-3">
          {user ? (
            <UserBadge className="size-11 text-sm" username={user.username} />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground">Kullanıcı adı</p>
          </div>
        </div>

        {error ? (
          <p
            aria-live="polite"
            className="mt-4 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          className="mt-5 w-full sm:w-auto"
          disabled={isLoggingOut}
          onClick={handleLogout}
          variant="secondary"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {isLoggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
        </Button>
      </section>

      <section
        aria-labelledby="appearance-title"
        className="animate-rise mt-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
        style={{ '--i': 3 }}
      >
        <h2
          className="text-base font-semibold text-foreground"
          id="appearance-title"
        >
          Görünüm
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sistem seçiliyken tema telefonunun ayarını izler.
        </p>
        <div className="mt-4 sm:max-w-sm">
          <ThemeSelector />
        </div>
      </section>
    </div>
  );
}
