import { useMutation } from '@tanstack/react-query';
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import { updateWeightUnit } from '@/api/account';
import { getAuthErrorMessage } from '@/auth/auth-api';
import { useAuth } from '@/auth/use-auth';
import { PageHeader } from '@/components/common/page-header';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/common/segmented-control';
import { UserBadge } from '@/components/common/user-badge';
import { CoachingSection } from '@/components/profile/coaching-section';
import { DataSection } from '@/components/profile/data-section';
import { MeasurementsSection } from '@/components/profile/measurements-section';
import { SecuritySection } from '@/components/profile/security-section';
import { Button } from '@/components/ui/button';
import type { WeightUnit } from '@/lib/format';
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme';

const themeOptions: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'system', label: 'Sistem', icon: Monitor },
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
];

const unitOptions: readonly SegmentedOption<WeightUnit>[] = [
  { value: 'kg', label: 'Kilogram' },
  { value: 'lb', label: 'Pound' },
];

function PreferencesSection() {
  const { updateUser, user } = useAuth();
  const [theme, setTheme] = useState(getThemePreference);
  const unitMutation = useMutation({
    mutationFn: updateWeightUnit,
    onSuccess: updateUser,
  });

  return (
    <section
      aria-labelledby="preferences-title"
      className="animate-rise mt-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      style={{ '--i': 4 }}
    >
      <h2
        className="text-lg font-semibold leading-tight text-foreground"
        id="preferences-title"
      >
        Tercihler
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground">Tema</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sistem seçiliyken telefonunun ayarını izler.
          </p>
          <SegmentedControl
            className="mt-2"
            label="Tema"
            layoutId="theme-indicator"
            onChange={(value) => {
              setTheme(value);
              setThemePreference(value);
            }}
            options={themeOptions}
            value={theme}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Ağırlık birimi</p>
          <p
            aria-live="polite"
            className="mt-0.5 text-xs text-muted-foreground"
          >
            {unitMutation.isError
              ? 'Birim kaydedilemedi. Yeniden deneyebilirsin.'
              : 'Tüm ağırlıklar bu birimle gösterilir.'}
          </p>
          <SegmentedControl
            className="mt-2"
            disabled={unitMutation.isPending}
            label="Ağırlık birimi"
            layoutId="unit-indicator"
            onChange={(value) => {
              if (value !== user?.weightUnit) unitMutation.mutate(value);
            }}
            options={unitOptions}
            value={
              unitMutation.isPending
                ? unitMutation.variables
                : (user?.weightUnit ?? 'kg')
            }
          />
        </div>
      </div>
    </section>
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
    <div className="max-w-3xl">
      <PageHeader
        description="Hesabını, ölçümlerini ve tercihlerini yönet."
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
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <UserBadge className="size-11 text-sm" username={user.username} />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground">Kullanıcı adı</p>
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={isLoggingOut}
            onClick={handleLogout}
            variant="secondary"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {isLoggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
          </Button>
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
      </section>

      <MeasurementsSection />
      <PreferencesSection />
      <CoachingSection />
      <SecuritySection />
      <DataSection />
    </div>
  );
}
