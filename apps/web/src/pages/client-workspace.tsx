import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import * as m from 'motion/react-m';
import { useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useParams } from 'react-router';

import { coachKeys, getClient } from '@/api/coach';
import { PageHeader } from '@/components/common/page-header';
import { ApiError } from '@/lib/api';
import { ClientScopeContext, type ClientScope } from '@/lib/client-scope';
import { createQueryClient } from '@/lib/query-client';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '', label: 'Raporlar', end: true },
  { to: 'history', label: 'Antrenmanlar', end: false },
  { to: 'log', label: 'Antrenman gir', end: false },
] as const;

/**
 * A coach's view of one linked client. Nested pages reuse the athlete's own
 * screens; the scope sends their requests to the client endpoints, and a
 * separate query cache keeps the client's data apart from the coach's.
 */
export function ClientWorkspace() {
  const { clientId = '' } = useParams();
  // Keyed so each client gets its own cache and state.
  return <ClientWorkspaceView clientId={clientId} key={clientId} />;
}

function ClientWorkspaceView({ clientId }: { clientId: string }) {
  const clientQuery = useQuery({
    queryKey: coachKeys.client(clientId),
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
  const [queryClient] = useState(createQueryClient);
  const client = clientQuery.data;
  const scope = useMemo<ClientScope | null>(
    () => (client ? { clientId: client.id, username: client.username } : null),
    [client],
  );

  if (
    !clientId ||
    (clientQuery.error instanceof ApiError && clientQuery.error.status === 404)
  ) {
    return <Navigate replace to="/app/clients" />;
  }

  return (
    <div>
      <Link
        className="group -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        to="/app/clients"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        Danışanlar
      </Link>

      {clientQuery.isPending ? (
        <div aria-label="Danışan yükleniyor" className="mt-4" role="status">
          <div className="skeleton h-9 w-48 rounded-md" />
          <div className="skeleton mt-3 h-4 w-72 max-w-full rounded-sm" />
        </div>
      ) : null}

      {clientQuery.isError && !scope ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          Danışan bilgisi alınamadı. Sayfayı yenileyip tekrar dene.
        </p>
      ) : null}

      {scope ? (
        <ClientScopeContext.Provider value={scope}>
          <QueryClientProvider client={queryClient}>
            <PageHeader
              className="mt-2"
              description="Koç görünümü. Kayıtlarını ve raporlarını görebilir, onun adına antrenman girebilirsin."
              title={scope.username}
            />

            <nav
              aria-label="Danışan bölümleri"
              className="mt-5 grid grid-cols-3 rounded-md bg-surface-strong p-1 sm:inline-grid"
            >
              {tabs.map(({ to, label, end }) => (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-10 items-center justify-center rounded-sm px-3 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring sm:px-5',
                      isActive
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted-foreground hover:text-foreground',
                    )
                  }
                  end={end}
                  key={label}
                  to={to}
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <m.span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-sm bg-surface shadow-[0_1px_2px_var(--shadow-tint)]"
                          layoutId="client-tab-indicator"
                          transition={{
                            type: 'spring',
                            stiffness: 520,
                            damping: 40,
                          }}
                        />
                      ) : null}
                      <span className="relative whitespace-nowrap">
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mt-2">
              <Outlet />
            </div>
          </QueryClientProvider>
        </ClientScopeContext.Provider>
      ) : null}
    </div>
  );
}
