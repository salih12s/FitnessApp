import { Link, useParams } from 'react-router';

import { InviteAcceptance } from '@/components/coach/invite-acceptance';
import { PageHeader } from '@/components/common/page-header';
import { parseInviteInput } from '@/lib/invite-code';

/** Target of a coach's invite link: `/app/join/<code>`. */
export function JoinPage() {
  const { code = '' } = useParams();
  const parsed = parseInviteInput(code);

  return (
    <div className="max-w-xl">
      <PageHeader
        description="Bir koç seni danışanı olarak eklemek için davet bağlantısı paylaştı."
        title="Koç daveti"
      />
      <section className="animate-rise mt-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
        {parsed ? (
          <InviteAcceptance code={parsed} />
        ) : (
          <p className="text-sm font-medium text-destructive" role="alert">
            Bu davet bağlantısı geçerli değil. Koçundan güncel bağlantıyı iste.
          </p>
        )}
      </section>
      <Link
        className="mt-4 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        to="/app/profile#coaching"
      >
        Koçlarını profilde yönet
      </Link>
    </div>
  );
}
