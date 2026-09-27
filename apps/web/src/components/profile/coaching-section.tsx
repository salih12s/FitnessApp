import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, RefreshCw, UserMinus } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';

import {
  coachKeys,
  getCoaches,
  getCoachStatus,
  regenerateInviteCode,
  removeCoach,
  setCoachMode,
} from '@/api/coach';
import { useAuth } from '@/auth/use-auth';
import { InviteAcceptance } from '@/components/coach/invite-acceptance';
import { SectionHeading } from '@/components/common/section-heading';
import { UserBadge } from '@/components/common/user-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatInviteCode,
  inviteLink,
  parseInviteInput,
} from '@/lib/invite-code';
import type { LinkedAccount } from '@/types/coach';

function CoachRow({ coach }: { coach: LinkedAccount }) {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => removeCoach(coach.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: coachKeys.coaches }),
  });

  return (
    <li className="py-3 first:pt-0">
      <div className="flex items-center gap-3">
        <UserBadge className="size-9 text-xs" username={coach.username} />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {coach.username}
        </p>
        {isConfirming ? null : (
          <Button
            aria-label={`${coach.username} koçunu kaldır`}
            className="-mr-2 size-11 min-h-11 text-muted-foreground hover:text-destructive"
            onClick={() => setIsConfirming(true)}
            size="icon"
            variant="ghost"
          >
            <UserMinus aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
      {isConfirming ? (
        <div
          aria-live="polite"
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            {coach.username} koçluğundan çıkılsın mı?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kayıtlarına erişimi hemen kapanır. Senin adına girdiği kayıtlar
            sende kalır.
          </p>
          {mutation.isError ? (
            <p className="mt-2 text-sm font-medium text-destructive">
              Kaldırılamadı. Yeniden deneyebilirsin.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => setIsConfirming(false)}
              variant="secondary"
            >
              Vazgeç
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              variant="destructive"
            >
              {mutation.isPending ? 'Kaldırılıyor' : 'Kaldır'}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function MyCoaches() {
  const [input, setInput] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: coachKeys.coaches, queryFn: getCoaches });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseInviteInput(input);
    setError(parsed ? null : 'Kod 8 karakter olmalı, örneğin ABCD 2345.');
    setCode(parsed);
  }

  function close() {
    setCode(null);
    setInput('');
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Koçların</p>
      {query.isPending ? (
        <div aria-hidden="true" className="skeleton mt-3 h-9 w-40 rounded-md" />
      ) : query.isError ? (
        <p className="mt-1 text-sm text-destructive" role="alert">
          Koç listesi alınamadı.
        </p>
      ) : query.data.length === 0 ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          Henüz bir koça bağlı değilsin.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {query.data.map((coach) => (
            <CoachRow coach={coach} key={coach.id} />
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-md border border-border bg-surface-elevated p-3 sm:p-4">
        {code ? (
          <InviteAcceptance
            code={code}
            key={code}
            onAccepted={() => setInput('')}
            onCancel={close}
          />
        ) : (
          <form noValidate onSubmit={submit}>
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="coach-invite-code"
            >
              Koç davet kodu
            </label>
            <div className="mt-1.5 flex gap-2">
              <Input
                aria-describedby={error ? 'coach-invite-error' : undefined}
                aria-invalid={error ? true : undefined}
                autoCapitalize="characters"
                autoComplete="off"
                className="metric-number uppercase"
                id="coach-invite-code"
                onChange={(event) => {
                  setInput(event.target.value);
                  setError(null);
                }}
                placeholder="ABCD 2345"
                spellCheck={false}
                value={input}
              />
              <Button className="shrink-0" type="submit" variant="secondary">
                Devam
              </Button>
            </div>
            {error ? (
              <p
                className="mt-2 text-sm font-medium text-destructive"
                id="coach-invite-error"
              >
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <Button
      className="w-full sm:w-auto"
      onClick={() => void copy()}
      variant="secondary"
    >
      {state === 'copied' ? (
        <Check aria-hidden="true" className="size-4 text-success" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      <span aria-live="polite">
        {state === 'copied'
          ? 'Kopyalandı'
          : state === 'failed'
            ? 'Kopyalanamadı'
            : label}
      </span>
    </Button>
  );
}

function CoachMode() {
  const queryClient = useQueryClient();
  const { updateUser, user } = useAuth();
  const [isConfirmingOff, setIsConfirmingOff] = useState(false);
  const status = useQuery({
    queryKey: coachKeys.status,
    queryFn: getCoachStatus,
  });
  const onStatus = (next: { isCoach: boolean; inviteCode: string | null }) => {
    queryClient.setQueryData(coachKeys.status, next);
    if (user && user.isCoach !== next.isCoach) {
      updateUser({ ...user, isCoach: next.isCoach });
    }
    void queryClient.invalidateQueries({ queryKey: coachKeys.clients });
  };
  const modeMutation = useMutation({
    mutationFn: setCoachMode,
    onSuccess: (next) => {
      setIsConfirmingOff(false);
      onStatus(next);
    },
  });
  const regenerateMutation = useMutation({
    mutationFn: regenerateInviteCode,
    onSuccess: onStatus,
  });

  if (status.isPending) {
    return <div aria-hidden="true" className="skeleton h-20 rounded-md" />;
  }
  if (status.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Koç modu bilgisi alınamadı.
      </p>
    );
  }

  const { isCoach, inviteCode } = status.data;

  if (!isCoach || !inviteCode) {
    return (
      <div>
        <p className="text-sm font-semibold text-foreground">Koç modu</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Danışanlarının antrenmanlarını takip et, onların adına kayıt gir ve
          program ata. Kendi antrenmanların aynen devam eder.
        </p>
        {modeMutation.isError ? (
          <p className="mt-2 text-sm font-medium text-destructive" role="alert">
            Koç modu açılamadı. Yeniden deneyebilirsin.
          </p>
        ) : null}
        <Button
          className="mt-3 w-full sm:w-auto"
          disabled={modeMutation.isPending}
          onClick={() => modeMutation.mutate(true)}
        >
          {modeMutation.isPending ? 'Açılıyor…' : 'Koç modunu aç'}
        </Button>
      </div>
    );
  }

  const link = inviteLink(inviteCode, window.location.origin);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Koç modu açık</p>
        <Link
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
          to="/app/clients"
        >
          Danışanlarına git
        </Link>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Bu kodu ya da bağlantıyı danışanınla paylaş. Kabul ettiğinde
        danışanların arasına eklenir.
      </p>
      <div className="mt-3 rounded-md bg-surface-strong px-4 py-3">
        <p className="text-xs text-muted-foreground">Davet kodun</p>
        <p className="metric-number mt-0.5 text-2xl font-semibold tracking-[0.12em] text-foreground">
          {formatInviteCode(inviteCode)}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <CopyButton label="Bağlantıyı kopyala" text={link} />
        <Button
          className="w-full sm:w-auto"
          disabled={regenerateMutation.isPending}
          onClick={() => regenerateMutation.mutate()}
          variant="ghost"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {regenerateMutation.isPending ? 'Yenileniyor…' : 'Yeni kod oluştur'}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Yeni kod oluşturunca eski kod ve bağlantı çalışmaz; mevcut danışanların
        etkilenmez.
      </p>

      {isConfirmingOff ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/8 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            Koç modu kapatılsın mı?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Tüm danışan bağlantıların ve davet kodun silinir. Danışanlarının
            kayıtları onlarda kalır.
          </p>
          {modeMutation.isError ? (
            <p className="mt-2 text-sm font-medium text-destructive">
              Kapatılamadı. Yeniden deneyebilirsin.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={modeMutation.isPending}
              onClick={() => setIsConfirmingOff(false)}
              variant="secondary"
            >
              Vazgeç
            </Button>
            <Button
              disabled={modeMutation.isPending}
              onClick={() => modeMutation.mutate(false)}
              variant="destructive"
            >
              {modeMutation.isPending ? 'Kapatılıyor' : 'Kapat'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="mt-3 w-full text-destructive hover:border-destructive/40 sm:w-auto"
          onClick={() => {
            modeMutation.reset();
            setIsConfirmingOff(true);
          }}
          variant="secondary"
        >
          Koç modunu kapat
        </Button>
      )}
    </div>
  );
}

export function CoachingSection() {
  const { hash } = useLocation();
  const sectionRef = useRef<HTMLElement>(null);

  // Links such as the empty client list point at this section.
  useEffect(() => {
    if (hash === '#coaching') {
      sectionRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [hash]);

  return (
    <section
      aria-labelledby="coaching-title"
      className="animate-rise mt-3 scroll-mt-20 rounded-lg border border-border bg-surface p-4 sm:p-5"
      id="coaching"
      ref={sectionRef}
      style={{ '--i': 5 }}
    >
      <SectionHeading
        description="Bir koça bağlan ya da kendin koçluk yap."
        id="coaching-title"
        title="Koçluk"
      />
      <div className="mt-4 divide-y divide-border">
        <div className="pb-5">
          <MyCoaches />
        </div>
        <div className="pt-5">
          <CoachMode />
        </div>
      </div>
    </section>
  );
}
