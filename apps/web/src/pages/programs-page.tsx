import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { assignTemplate, coachKeys, getClients } from '@/api/coach';
import { deleteTemplate, getTemplates, templateKeys } from '@/api/templates';
import { useAuth } from '@/auth/use-auth';
import { FeedbackPanel } from '@/components/common/feedback-panel';
import { PageHeader } from '@/components/common/page-header';
import {
  useActiveSession,
  useStartSession,
} from '@/components/sessions/use-active-session';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { exercisePath } from '@/lib/exercise-path';
import { formatWeightWithUnit } from '@/lib/format';
import { formatSchedule } from '@/lib/weekdays';
import type { WorkoutTemplate } from '@/types/template';

const lastUsedFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
});

const secondaryLinkClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground shadow-[0_1px_2px_var(--shadow-tint)] outline-none transition-[background-color,transform] duration-200 hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.98]';

function AssignRow({
  templateId,
  client,
}: {
  templateId: string;
  client: { id: string; username: string };
}) {
  const mutation = useMutation({
    mutationFn: () => assignTemplate(client.id, templateId),
  });

  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {client.username}
        </span>
        {mutation.isSuccess ? (
          <span
            aria-live="polite"
            className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-success"
          >
            <Check aria-hidden="true" className="size-4" />
            Atandı
          </span>
        ) : (
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            variant="secondary"
          >
            {mutation.isPending ? 'Atanıyor…' : 'Ata'}
          </Button>
        )}
      </div>
      {mutation.isError ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {mutation.error instanceof ApiError && mutation.error.status === 400
            ? 'Özel hareket içeren programlar danışana atanamaz.'
            : 'Atanamadı. Yeniden deneyebilirsin.'}
        </p>
      ) : null}
    </li>
  );
}

/** Copies the template into a client's programs; the coach's copy stays. */
function AssignPanel({
  templateId,
  onClose,
}: {
  templateId: string;
  onClose: () => void;
}) {
  const clientsQuery = useQuery({
    queryKey: coachKeys.clients,
    queryFn: getClients,
    retry: 1,
  });

  return (
    <div className="mt-3 rounded-md border border-border bg-surface-elevated p-3">
      <p className="text-sm font-semibold text-foreground">Danışana ata</p>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
        Programın bir kopyası danışanın programlarına eklenir. Sonradan yaptığın
        değişiklikler kopyaya yansımaz.
      </p>
      {clientsQuery.isPending ? (
        <div aria-hidden="true" className="skeleton mt-3 h-11 rounded-md" />
      ) : clientsQuery.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          Danışan listesi alınamadı.
        </p>
      ) : clientsQuery.data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Henüz danışanın yok.{' '}
          <Link
            className="font-semibold text-primary hover:underline"
            to="/app/profile#coaching"
          >
            Davet kodunu paylaş
          </Link>
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {clientsQuery.data.map((client) => (
            <AssignRow
              client={client}
              key={client.id}
              templateId={templateId}
            />
          ))}
        </ul>
      )}
      <Button className="mt-2 w-full" onClick={onClose} variant="ghost">
        Kapat
      </Button>
    </div>
  );
}

function TemplateCard({
  template,
  index,
  canStart,
}: {
  template: WorkoutTemplate;
  index: number;
  canStart: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const startMutation = useStartSession();
  const deleteMutation = useMutation({
    mutationFn: () => deleteTemplate(template.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });

  function start() {
    startMutation.mutate(template.id, {
      // Go straight to the first planned exercise.
      onSuccess: () => navigate(exercisePath(template.exercises[0].exercise)),
    });
  }

  return (
    <article
      className="animate-rise rounded-lg border border-border bg-surface p-4 sm:p-5"
      style={{ '--i': index }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">
            {template.name}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatSchedule(template.scheduledDays)}
            {template.lastUsedAt ? (
              <>
                {' · son '}
                <span className="font-mono tabular-nums">
                  {lastUsedFormatter.format(new Date(template.lastUsedAt))}
                </span>
              </>
            ) : null}
          </p>
          {template.assignedBy ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound aria-hidden="true" className="size-3.5" />
              Koçun atadı: {template.assignedBy.username}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {template.exercises.length} hareket
        </span>
      </div>

      <ol className="mt-3 divide-y divide-border">
        {template.exercises.map((row) => (
          <li
            className="flex min-h-10 items-center justify-between gap-3 py-1.5 text-sm"
            key={row.position}
          >
            <span className="min-w-0 truncate text-foreground">
              {row.exercise.name}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {row.targetSets} × {row.targetReps}
              {row.targetWeightKg
                ? ` · ${formatWeightWithUnit(row.targetWeightKg)}`
                : ''}
            </span>
          </li>
        ))}
      </ol>

      {isConfirmingDelete ? (
        <div
          aria-live="polite"
          className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            Bu program silinsin mi?
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Programla yaptığın antrenmanlar ve kayıtlar korunur.
          </p>
          {deleteMutation.isError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Program silinemedi. Tekrar dene.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => setIsConfirmingDelete(false)}
              variant="secondary"
            >
              Vazgeç
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {deleteMutation.isPending ? 'Siliniyor' : 'Sil'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="flex-1 sm:flex-none"
            disabled={!canStart || startMutation.isPending}
            onClick={start}
          >
            <Play aria-hidden="true" className="size-4" />
            {startMutation.isPending ? 'Başlatılıyor…' : 'Başlat'}
          </Button>
          <Link
            aria-label={`${template.name} programını düzenle`}
            className={secondaryLinkClass}
            to={`/app/programs/${template.id}`}
          >
            <Pencil aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Düzenle</span>
          </Link>
          <Button
            aria-label={`${template.name} programını sil`}
            className="text-destructive"
            onClick={() => setIsConfirmingDelete(true)}
            variant="secondary"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Sil</span>
          </Button>
          {user?.isCoach ? (
            <Button
              aria-expanded={isAssigning}
              aria-label={`${template.name} programını danışana ata`}
              onClick={() => setIsAssigning((current) => !current)}
              variant="secondary"
            >
              <Send aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Danışana ata</span>
            </Button>
          ) : null}
        </div>
      )}
      {isAssigning && !isConfirmingDelete ? (
        <AssignPanel
          onClose={() => setIsAssigning(false)}
          templateId={template.id}
        />
      ) : null}
      {startMutation.isError ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Antrenman başlatılamadı. Tekrar dene.
        </p>
      ) : null}
    </article>
  );
}

export function ProgramsPage() {
  const templatesQuery = useQuery({
    queryKey: templateKeys.all,
    queryFn: getTemplates,
    retry: 1,
  });
  const { data: activeSession } = useActiveSession();
  const templates = templatesQuery.data ?? [];

  return (
    <div>
      <PageHeader
        action={
          templates.length > 0 ? (
            <Link className={secondaryLinkClass} to="/app/programs/new">
              <Plus aria-hidden="true" className="size-4" />
              Yeni program
            </Link>
          ) : undefined
        }
        description="Sık yaptığın antrenmanları hedefleriyle kaydet, tek dokunuşla başlat."
        title="Programlar"
      />

      {activeSession && templates.length > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Süren bir antrenmanın var. Yeni bir program başlatmak için önce onu
          bitir.
        </p>
      ) : null}

      <div className="mt-6">
        {templatesQuery.isPending ? (
          <div
            aria-label="Programlar yükleniyor"
            className="grid gap-3 md:grid-cols-2"
            role="status"
          >
            {Array.from({ length: 2 }, (_, index) => (
              <div
                aria-hidden="true"
                className="skeleton h-52 rounded-lg border border-border"
                key={index}
              />
            ))}
          </div>
        ) : null}

        {templatesQuery.isError ? (
          <FeedbackPanel
            actionLabel="Tekrar dene"
            description="Programların alınamadı. Yeniden deneyebilirsin."
            icon={AlertTriangle}
            isActionPending={templatesQuery.isFetching}
            onAction={() => void templatesQuery.refetch()}
            title="Programlar yüklenemedi"
          />
        ) : null}

        {templatesQuery.isSuccess && templates.length === 0 ? (
          <div className="animate-rise rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div className="grid size-10 place-items-center rounded-md bg-surface-strong text-muted-foreground">
              <ClipboardList
                aria-hidden="true"
                className="size-5"
                strokeWidth={1.75}
              />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Henüz programın yok
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Hareketleri, set ve tekrar hedeflerini bir kez gir. Sonra tek
              dokunuşla antrenmanı başlat ve takvimde planlı günlerini gör.
            </p>
            <Link
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.98]"
              to="/app/programs/new"
            >
              <Plus aria-hidden="true" className="size-4" />
              Program oluştur
            </Link>
          </div>
        ) : null}

        {templates.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template, index) => (
              <TemplateCard
                canStart={!activeSession}
                index={index}
                key={template.id}
                template={template}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
