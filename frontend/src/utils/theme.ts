import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'auto';

const THEME_KEY = 'aptis-theme';
const QUERY = '(prefers-color-scheme: dark)';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto';
  const value = window.localStorage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
}

export function resolveThemePreference(preference: ThemePreference) {
  if (preference !== 'auto') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(QUERY).matches ? 'dark' : 'light';
}

export function applyThemePreference(preference = getStoredThemePreference()) {
  const resolved = resolveThemePreference(preference);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = resolved;
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveThemePreference(preference));

  useEffect(() => {
    const media = window.matchMedia(QUERY);

    const apply = () => {
      applyThemePreference(preference);
      setResolvedTheme(resolveThemePreference(preference));
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  function setPreference(nextPreference: ThemePreference) {
    window.localStorage.setItem(THEME_KEY, nextPreference);
    setPreferenceState(nextPreference);
  }

  return { preference, resolvedTheme, setPreference };
}
