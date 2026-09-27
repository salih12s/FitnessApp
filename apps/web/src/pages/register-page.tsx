import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import { getAuthErrorMessage } from '@/auth/auth-api';
import { postAuthDestination } from '@/auth/route-access';
import { useAuth } from '@/auth/use-auth';
import { PasswordField, UsernameField } from '@/components/auth/auth-fields';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { isValidUsername, normalizeUsername } from '@/lib/username';

export function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = normalizeUsername(String(formData.get('username') ?? ''));
    const password = String(formData.get('password') ?? '');

    if (!isValidUsername(username)) {
      setError(
        'Kullanıcı adı 3-20 karakter olmalı; harf, rakam, nokta ve alt çizgi kullanılabilir.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ username, password });
      navigate(postAuthDestination(location.state), { replace: true });
    } catch (submitError: unknown) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      description="Birkaç saniyede başla, ilk setini bugün kaydet."
      title="Hesap oluştur"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <UsernameField />
        <PasswordField
          autoComplete="new-password"
          placeholder="En az 8 karakter"
        />

        {error ? (
          <p
            aria-live="polite"
            className="text-sm leading-6 text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          className="w-full"
          disabled={isSubmitting}
          size="lg"
          type="submit"
        >
          {isSubmitting ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
          {!isSubmitting ? (
            <ArrowRight aria-hidden="true" className="size-4" />
          ) : null}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link
          className="inline-flex min-h-11 items-center rounded-sm px-1 font-semibold text-foreground underline decoration-border-strong underline-offset-4 outline-none transition-colors hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring"
          state={location.state}
          to="/login"
        >
          Giriş yap
        </Link>
      </p>
    </AuthLayout>
  );
}
