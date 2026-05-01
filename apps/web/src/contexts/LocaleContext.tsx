'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Locale = 'ar' | 'en';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggle: () => void;
  t: <T extends string>(ar: T, en: T) => T;
  dir: 'rtl' | 'ltr';
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'juthoor.locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') setLocaleState(stored);
    } catch {
      // ignore — SSR or private mode
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', locale);
    root.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }, [locale, setLocale]);

  const t = useCallback(
    <T extends string>(ar: T, en: T): T => (locale === 'ar' ? ar : en),
    [locale],
  );

  const dir: 'rtl' | 'ltr' = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggle, t, dir }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
