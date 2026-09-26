export type ThemePreference = 'system' | 'light' | 'dark';

// Keep the key, colors, and resolution rules in sync with index.html.
const storageKey = 'fitness-theme';
const themeColors = { light: '#f3f4f6', dark: '#0e0f11' } as const;
const darkQuery = '(prefers-color-scheme: dark)';

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(preference: ThemePreference) {
  const theme =
    preference === 'system'
      ? window.matchMedia(darkQuery).matches
        ? 'dark'
        : 'light'
      : preference;

  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[theme]);
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, preference);
    }
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts
    // for this page view only.
  }
  applyTheme(preference);
}

/** Follows operating-system theme changes while the preference is "system". */
export function watchSystemTheme() {
  window.matchMedia(darkQuery).addEventListener('change', () => {
    if (getThemePreference() === 'system') {
      applyTheme('system');
    }
  });
}
