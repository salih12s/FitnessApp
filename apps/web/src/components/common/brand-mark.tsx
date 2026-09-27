/**
 * The FitnessApp mark: an "F" built from rounded set rows. The same drawing
 * is the favicon, the PWA icon (`public/pwa-*.svg`), and `docs/media/logo.svg`.
 */
function LogoMark() {
  return (
    <svg aria-hidden="true" className="size-8 shrink-0" viewBox="0 0 64 64">
      <rect fill="#0e0f11" height="64" rx="15" width="64" />
      <g fill="#ff6a2b">
        <rect height="36" rx="4.5" width="9" x="18" y="14" />
        <rect height="9" rx="4.5" width="29" x="18" y="14" />
        <rect height="9" rx="4.5" width="12" x="31" y="28.5" />
      </g>
    </svg>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5" aria-label="FitnessApp">
      <LogoMark />
      <span className="text-[0.9375rem] font-semibold tracking-[-0.02em]">
        FitnessApp
      </span>
    </div>
  );
}
