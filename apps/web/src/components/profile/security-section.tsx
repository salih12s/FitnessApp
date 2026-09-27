import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, MonitorSmartphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  accountKeys,
  changePassword,
  getOtherSessionCount,
  logoutOtherDevices,
} from '@/api/account';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';

function ChangePasswordForm({
  onCancel,
  onChanged,
}: {
  onCancel: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: accountKeys.otherSessions,
      });
      onChanged();
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError && mutationError.status === 403
          ? 'Mevcut şifre hatalı.'
          : 'Şifre değiştirilemedi. Yeniden deneyebilirsin.',
      ),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword) {
      setError('Mevcut şifreni gir.');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError('Yeni şifre 8 ile 128 karakter arasında olmalı.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Yeni şifre mevcut şifreden farklı olmalı.');
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <form
      className="mt-3 rounded-md border border-border bg-surface-elevated p-3 sm:p-4"
      noValidate
      onSubmit={submit}
    >
      {/* Lets password managers attach the new password to this account. */}
      <input autoComplete="username" hidden readOnly />
      <label className="block text-sm font-medium text-foreground">
        Mevcut şifre
        <Input
          autoComplete="current-password"
          className="mt-1.5"
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          value={currentPassword}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-foreground">
        Yeni şifre
        <Input
          autoComplete="new-password"
          className="mt-1.5"
          maxLength={128}
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          value={newPassword}
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          En az 8 karakter. Diğer cihazlardaki oturumlar kapanır.
        </span>
      </label>
      {error ? (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button
          disabled={mutation.isPending}
          onClick={onCancel}
          variant="secondary"
        >
          Vazgeç
        </Button>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Kaydediliyor' : 'Şifreyi değiştir'}
        </Button>
      </div>
    </form>
  );
}

function OtherDevices() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: accountKeys.otherSessions,
    queryFn: getOtherSessionCount,
  });
  const mutation = useMutation({
    mutationFn: logoutOtherDevices,
    onSuccess: () => queryClient.setQueryData(accountKeys.otherSessions, 0),
  });
  const count = query.data;

  let status = 'Kontrol ediliyor…';
  if (query.isError) status = 'Oturum bilgisi alınamadı.';
  else if (count === 0) status = 'Yalnızca bu cihazda açık.';
  else if (count !== undefined)
    status = `${count} başka cihazda açık oturum var.`;

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 last:pb-0">
      <div className="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-strong text-muted-foreground">
        <MonitorSmartphone aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Oturumlar</p>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {mutation.isError
            ? 'Çıkış yapılamadı. Yeniden deneyebilirsin.'
            : status}
        </p>
      </div>
      {count ? (
        <Button
          className="w-full sm:w-auto"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          variant="secondary"
        >
          {mutation.isPending
            ? 'Çıkış yapılıyor…'
            : 'Diğer cihazlardan çıkış yap'}
        </Button>
      ) : null}
    </div>
  );
}

export function SecuritySection() {
  const [isChanging, setIsChanging] = useState(false);
  const [isChanged, setIsChanged] = useState(false);

  return (
    <section
      aria-labelledby="security-title"
      className="animate-rise mt-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      style={{ '--i': 5 }}
    >
      <SectionHeading id="security-title" title="Güvenlik" />
      <div className="mt-3 divide-y divide-border">
        <div className="pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-strong text-muted-foreground">
              <KeyRound aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Şifre</p>
              <p
                aria-live="polite"
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {isChanged ? (
                  <>
                    <Check
                      aria-hidden="true"
                      className="size-3.5 text-success"
                    />
                    Şifren değiştirildi.
                  </>
                ) : (
                  'Giriş yaparken kullandığın şifre.'
                )}
              </p>
            </div>
            {isChanging ? null : (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsChanged(false);
                  setIsChanging(true);
                }}
                variant="secondary"
              >
                Şifreyi değiştir
              </Button>
            )}
          </div>
          {isChanging ? (
            <ChangePasswordForm
              onCancel={() => setIsChanging(false)}
              onChanged={() => {
                setIsChanging(false);
                setIsChanged(true);
              }}
            />
          ) : null}
        </div>
        <OtherDevices />
      </div>
    </section>
  );
}
