import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readRaw, writeRaw, THEME_KEY } from '../lib/storage';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  /** True only when the user picked a theme, false while following the OS. */
  explicit: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function initialTheme(): Theme {
  const saved = readRaw('local', THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  // index.html applies the same rule before first paint, so there is no flash.
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  return systemTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [explicit, setExplicit] = useState(() => readRaw('local', THEME_KEY) !== null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Keep mobile browser chrome in step with an explicit choice, not just the OS.
    const color = theme === 'dark' ? '#0d0d0d' : '#ffffff';
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', color));
  }, [theme]);

  // Only follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    if (explicit) return;
    let media: MediaQueryList;
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [explicit]);

  // Keep a second tab in sync when the theme is changed there.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return;
      if (event.newValue === 'dark' || event.newValue === 'light') {
        setThemeState(event.newValue);
        setExplicit(true);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setExplicit(true);
    writeRaw('local', THEME_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, explicit, setTheme, toggle }),
    [theme, explicit, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
