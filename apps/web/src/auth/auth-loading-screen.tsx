import { BrandMark } from '@/components/common/brand-mark';

export function AuthLoadingScreen() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5">
      <div aria-live="polite" className="flex flex-col items-center gap-5">
        <BrandMark />
        <p className="text-sm font-medium text-muted-foreground">
          Oturum kontrol ediliyor…
        </p>
      </div>
    </main>
  );
}
