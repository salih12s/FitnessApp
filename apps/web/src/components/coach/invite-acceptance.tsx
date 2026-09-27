import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, PencilLine, ShieldCheck } from 'lucide-react';

import { acceptInvite, coachKeys, previewInvite } from '@/api/coach';
import { UserBadge } from '@/components/common/user-badge';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

const permissions = [
  [Eye, 'Antrenman geçmişini ve raporlarını görebilir.'],
  [PencilLine, 'Senin adına antrenman girebilir; bu kayıtlar işaretlenir.'],
  [
    ShieldCheck,
    'Senin girdiğin kayıtları değiştiremez. Koçu istediğin zaman kaldırabilirsin.',
  ],
] as const;

interface InviteAcceptanceProps {
  code: string;
  onCancel?: () => void;
  onAccepted?: () => void;
}

/** Shows who is inviting, what they will be able to do, and asks to accept. */
export function InviteAcceptance({
  code,
  onCancel,
  onAccepted,
}: InviteAcceptanceProps) {
  const queryClient = useQueryClient();
  const preview = useQuery({
    queryKey: coachKeys.invite(code),
    queryFn: () => previewInvite(code),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) && failureCount < 2,
  });
  const mutation = useMutation({
    mutationFn: () => acceptInvite(code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coaches'] });
      onAccepted?.();
    },
  });

  if (preview.isPending) {
    return (
      <div aria-label="Davet kontrol ediliyor" className="py-2" role="status">
        <div className="skeleton h-11 w-48 rounded-md" />
      </div>
    );
  }

  if (preview.isError) {
    const status =
      preview.error instanceof ApiError ? preview.error.status : undefined;
    return (
      <div>
        <p className="text-sm font-medium text-destructive" role="alert">
          {status === 400
            ? 'Bu senin kendi davet kodun.'
            : status === 404
              ? 'Bu davet kodu geçerli değil. Koçundan güncel kodu iste.'
              : 'Davet kontrol edilemedi. Yeniden deneyebilirsin.'}
        </p>
        {onCancel ? (
          <Button className="mt-3" onClick={onCancel} variant="secondary">
            Geri dön
          </Button>
        ) : null}
      </div>
    );
  }

  const { coach, alreadyLinked } = preview.data;
  const isLinked = alreadyLinked || mutation.isSuccess;

  return (
    <div>
      <div className="flex items-center gap-3">
        <UserBadge className="size-11 text-sm" username={coach.username} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {coach.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLinked ? 'Koçun' : 'Seni danışanı olarak eklemek istiyor'}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {permissions.map(([Icon, text]) => (
          <li className="flex gap-2.5 text-sm text-muted-foreground" key={text}>
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-foreground"
            />
            {text}
          </li>
        ))}
      </ul>

      {mutation.isError ? (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          Davet kabul edilemedi. Yeniden deneyebilirsin.
        </p>
      ) : null}

      {isLinked ? (
        <p
          aria-live="polite"
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-success"
        >
          <Check aria-hidden="true" className="size-4" />
          {coach.username} artık koçun.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          {onCancel ? (
            <Button
              disabled={mutation.isPending}
              onClick={onCancel}
              variant="secondary"
            >
              Vazgeç
            </Button>
          ) : null}
          <Button
            className={onCancel ? undefined : 'col-span-2'}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Kabul ediliyor' : 'Daveti kabul et'}
          </Button>
        </div>
      )}
    </div>
  );
}
