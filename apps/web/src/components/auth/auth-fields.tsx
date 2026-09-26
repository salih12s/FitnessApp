import { AtSign, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';

export function UsernameField() {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor="username">
        Kullanıcı adı
      </label>
      <div className="relative">
        <AtSign
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect="off"
          className="pl-11 text-base"
          id="username"
          maxLength={20}
          name="username"
          placeholder="kullaniciadi"
          required
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function PasswordField({
  autoComplete,
  placeholder,
}: {
  autoComplete: 'current-password' | 'new-password';
  placeholder: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor="password">
        Şifre
      </label>
      <div className="relative">
        <LockKeyhole
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoComplete={autoComplete}
          className="pl-11 pr-14 text-base"
          id="password"
          maxLength={128}
          minLength={autoComplete === 'new-password' ? 8 : undefined}
          name="password"
          placeholder={placeholder}
          required
          type={isVisible ? 'text' : 'password'}
        />
        <button
          aria-label={isVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          aria-pressed={isVisible}
          className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
