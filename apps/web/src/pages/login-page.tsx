import { useState, type FormEvent } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import { getAuthErrorMessage } from '@/auth/auth-api';
import { postAuthDestination } from '@/auth/route-access';
import { useAuth } from '@/auth/use-auth';
import { PasswordField, UsernameField } from '@/components/auth/auth-fields';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { normalizeUsername } from '@/lib/username';

export function LoginPage() {
  const { login, startDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const isBusy = isSubmitting || isStartingDemo;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = normalizeUsername(String(formData.get('username') ?? ''));
    const password = String(formData.get('password') ?? '');

    try {
      await login({ username, password });
      navigate(postAuthDestination(location.state), { replace: true });
    } catch (submitError: unknown) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setIsStartingDemo(true);

    try {
      await startDemo();
      navigate(postAuthDestination(location.state), { replace: true });
    } catch (demoError: unknown) {
      setError(getAuthErrorMessage(demoError));
    } finally {
      setIsStartingDemo(false);
    }
  }

  return (
    <AuthLayout
      description="Antrenmanlarına kaldığın yerden devam et."
      title="Giriş yap"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <UsernameField />
        <PasswordField
          autoComplete="current-password"
          placeholder="Şifreni gir"
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

        <Button className="w-full" disabled={isBusy} size="lg" type="submit">
          {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          {!isSubmitting ? (
            <ArrowRight aria-hidden="true" className="size-4" />
          ) : null}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-6">
        <Button
          className="w-full"
          disabled={isBusy}
          onClick={handleDemo}
          size="lg"
          type="button"
          variant="secondary"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          {isStartingDemo ? 'Demo hazırlanıyor…' : 'Demo hesabıyla dene'}
        </Button>
        <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
          Kayıt gerekmez. Üç aylık örnek antrenman, program ve danışan verisiyle
          sana özel bir hesap açılır, 24 saat sonra silinir.
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link
          className="inline-flex min-h-11 items-center rounded-sm px-1 font-semibold text-foreground underline decoration-border-strong underline-offset-4 outline-none transition-colors hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring"
          state={location.state}
          to="/register"
        >
          Kayıt ol
        </Link>
      </p>
    </AuthLayout>
  );
}
