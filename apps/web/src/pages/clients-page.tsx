import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, UserMinus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { coachKeys, getClients, removeClient } from '@/api/coach';
import { useAuth } from '@/auth/use-auth';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import { UserBadge } from '@/components/common/user-badge';
import { Button } from '@/components/ui/button';
import { formatVolume } from '@/lib/format';
import { formatRelativeDay } from '@/lib/relative-day';
import type { ClientSummary } from '@/types/coach';

function ClientCard({
  client,
  index,
}: {
  client: ClientSummary;
  index: number;
}) {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => removeClient(client.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: coachKeys.clients }),
  });
  const { trainingDays, setCount, volumeKg } = client.last7Days;
  const volume = formatVolume(volumeKg);

  return (
    <li
      className="animate-rise rounded-lg border border-border bg-surface"
      style={{ '--i': index }}
    >
      <div className="flex items-center gap-1 pr-2">
        <Link
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg p-4 outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring"
          to={`/app/clients/${client.id}`}
        >
          <UserBadge className="size-11 text-sm" username={client.username} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold text-foreground transition-colors group-hover:text-primary">
              {client.username}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {client.lastActivityAt
                ? `Son antrenman ${formatRelativeDay(client.lastActivityAt)}`
                : 'Henüz kayıt yok'}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        {isConfirming ? null : (
          <Button
            aria-label={`${client.username} danışanını çıkar`}
            className="size-11 min-h-11 text-muted-foreground hover:text-destructive"
            onClick={() => setIsConfirming(true)}
            size="icon"
            variant="ghost"
          >
            <UserMinus aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-3 border-t border-border">
        {(
          [
            ['Gün', String(trainingDays), null],
            ['Set', String(setCount), null],
            ['Hacim', volume.value, volume.unit],
          ] as const
        ).map(([label, value, unit]) => (
          <div
            className="border-r border-border px-4 py-3 last:border-r-0"
            key={label}
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="metric-number mt-0.5 text-lg font-semibold text-foreground">
              {value}
              {unit ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {unit}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-border px-4 py-2 text-[0.6875rem] text-muted-foreground">
        Son 7 gün
      </p>

      {isConfirming ? (
        <div
          aria-live="polite"
          className="m-3 mt-0 rounded-md border border-destructive/30 bg-destructive/8 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            {client.username} danışanlarından çıkarılsın mı?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kayıtlarına erişimin hemen kapanır. Onun adına girdiğin kayıtlar
            onda kalır.
          </p>
          {mutation.isError ? (
            <p className="mt-2 text-sm font-medium text-destructive">
              Çıkarılamadı. Yeniden deneyebilirsin.
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
              {mutation.isPending ? 'Çıkarılıyor' : 'Çıkar'}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: coachKeys.clients,
    queryFn: getClients,
    enabled: Boolean(user?.isCoach),
    retry: 1,
  });

  if (user && !user.isCoach) {
    return <Navigate replace to="/app/profile#coaching" />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        description="Bağlı danışanlarının son etkinliği. Birini seçerek kayıtlarını gör ya da onun adına antrenman gir."
        title="Danışanlar"
      />

      {query.isPending ? (
        <div
          aria-label="Danışanlar yükleniyor"
          className="mt-6 grid gap-3"
          role="status"
        >
          <div className="skeleton h-40 rounded-lg" />
          <div className="skeleton h-40 rounded-lg" />
        </div>
      ) : null}

      {query.isError ? (
        <div className="mt-6">
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Danışan listesi alınamadı. Yeniden deneyebilirsin."
            icon={AlertTriangle}
            isActionPending={query.isFetching}
            onAction={() => void query.refetch()}
            title="Danışanlar yüklenemedi"
          />
        </div>
      ) : null}

      {query.isSuccess && query.data.length === 0 ? (
        <div className="mt-6">
          <FeedbackPanel
            actionLabel="Davet kodunu göster"
            description="Profil sayfasındaki davet kodunu ya da bağlantını danışanınla paylaş. Kabul ettiğinde burada görünür."
            icon={Users}
            onAction={() => navigate('/app/profile#coaching')}
            title="Henüz danışanın yok"
          />
        </div>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {query.data.map((client, index) => (
            <ClientCard client={client} index={index} key={client.id} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
