import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Locale, translations } from './translations';

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, defaultText?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const I18N_STORAGE_KEY = 'spicehub_locale';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(I18N_STORAGE_KEY);
      if (stored === 'hi' || stored === 'en') return stored;
    }
    return 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(I18N_STORAGE_KEY, newLocale);
      window.dispatchEvent(new CustomEvent('spicehub:locale_change', { detail: newLocale }));
    }
  }, []);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === 'en' ? 'hi' : 'en';
    setLocale(next);
  }, [locale, setLocale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === I18N_STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'hi')) {
        setLocaleState(e.newValue);
      }
    };

    const handleCustomChange = (e: any) => {
      if (e.detail === 'en' || e.detail === 'hi') {
        setLocaleState(e.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('spicehub:locale_change', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('spicehub:locale_change', handleCustomChange);
    };
  }, []);

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      if (!key) return defaultText || '';
      const trimmed = key.trim();
      const currentDict = translations[locale] || translations.en;
      if (currentDict && currentDict[trimmed]) {
        return currentDict[trimmed];
      }
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      if (locale === 'hi') {
        if (translations.hi[trimmed]) return translations.hi[trimmed];
        if (translations.hi[key]) return translations.hi[key];
        if (translations.en[trimmed]) return defaultText || translations.en[trimmed];
      }
      return defaultText || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = (): I18nContextType => {
  return useContext(I18nContext);
};

export interface LanguageToggleProps {
  className?: string;
  isDark?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '', isDark = false }) => {
  const { locale, toggleLocale } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
        isDark
          ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
      } ${className}`}
      title={locale === 'en' ? 'हिन्दी में बदलें (Switch to Hindi)' : 'Switch to English (अंग्रेजी में बदलें)'}
    >
      <span className="text-sm leading-none">🌐</span>
      <span className="font-bold tracking-tight">
        {locale === 'en' ? 'हिन्दी' : 'English'}
      </span>
    </button>
  );
};
