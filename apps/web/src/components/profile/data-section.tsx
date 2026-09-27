import { useMutation } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { deleteAccount, downloadLogsCsv } from '@/api/account';
import { useAuth } from '@/auth/use-auth';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';

const CONFIRMATION = 'hesabımı sil';

function ExportButton({ className }: { className?: string }) {
  const mutation = useMutation({ mutationFn: downloadLogsCsv });

  return (
    <div className={className}>
      <Button
        className="w-full sm:w-auto"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        variant="secondary"
      >
        <Download aria-hidden="true" className="size-4" />
        {mutation.isPending ? 'Hazırlanıyor…' : 'CSV olarak indir'}
      </Button>
      {mutation.isError ? (
        <p className="mt-2 text-sm font-medium text-destructive" role="alert">
          Dosya hazırlanamadı. Yeniden deneyebilirsin.
        </p>
      ) : null}
    </div>
  );
}

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const { clearSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => deleteAccount(password, CONFIRMATION),
    onSuccess: clearSession,
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError && mutationError.status === 403
          ? 'Şifre hatalı.'
          : 'Hesap silinemedi. Yeniden deneyebilirsin.',
      ),
  });
  const isConfirmed =
    confirmation.trim().toLocaleLowerCase('tr') === CONFIRMATION;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError('Şifreni gir.');
      return;
    }
    if (!isConfirmed) return;
    setError(null);
    mutation.mutate();
  }

  return (
    <form
      className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 p-3 sm:p-4"
      noValidate
      onSubmit={submit}
    >
      <p className="text-sm font-semibold text-foreground">
        Hesabın kalıcı olarak silinsin mi?
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Tüm antrenman kayıtların, programların, özel hareketlerin ve ölçümlerin
        silinir. Bu işlem geri alınamaz. Önce kayıtlarını indirmek
        isteyebilirsin.
      </p>
      <ExportButton className="mt-3" />
      <input autoComplete="username" hidden readOnly />
      <label className="mt-4 block text-sm font-medium text-foreground">
        Şifre
        <Input
          autoComplete="current-password"
          className="mt-1.5"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-foreground">
        Onaylamak için <span className="font-mono">{CONFIRMATION}</span> yaz
        <Input
          autoCapitalize="none"
          autoComplete="off"
          className="mt-1.5"
          onChange={(event) => setConfirmation(event.target.value)}
          spellCheck={false}
          value={confirmation}
        />
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
        <Button
          disabled={mutation.isPending || !isConfirmed}
          type="submit"
          variant="destructive"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {mutation.isPending ? 'Siliniyor' : 'Hesabı sil'}
        </Button>
      </div>
    </form>
  );
}

export function DataSection() {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <section
      aria-labelledby="data-title"
      className="animate-rise mt-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
      style={{ '--i': 6 }}
    >
      <SectionHeading
        description="Tüm setlerini tarih, hareket, ağırlık ve tekrarla birlikte Excel'de açılabilen bir dosyaya aktar."
        id="data-title"
        title="Verilerin"
      />
      <ExportButton className="mt-4" />

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">Hesabı sil</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Hesabını ve tüm verilerini kalıcı olarak kaldırır.
        </p>
        {isDeleting ? (
          <DeleteAccountForm onCancel={() => setIsDeleting(false)} />
        ) : (
          <Button
            className="mt-3 w-full text-destructive hover:border-destructive/40 sm:w-auto"
            onClick={() => setIsDeleting(true)}
            variant="secondary"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Hesabımı sil
          </Button>
        )}
      </div>
    </section>
  );
}
