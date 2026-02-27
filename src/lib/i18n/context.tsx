'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Language, Translations } from './types';
import { translations } from './loader';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage?.getItem('taptalk-language') as Language;
      const validLangs: Language[] = ['ko', 'en', 'nl', 'ru', 'fr', 'es', 'zh', 'de'];
      if (saved && validLangs.includes(saved as Language)) {
        setLanguage(saved);
        document.cookie = `lang=${saved};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      } else {
        document.cookie = `lang=en;path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      }
    } catch {
      document.cookie = `lang=en;path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    try { localStorage?.setItem('taptalk-language', lang); } catch {}
    document.cookie = `lang=${lang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  nl: 'Nederlands',
  ru: 'Русский',
  fr: 'Français',
  es: 'Español',
  zh: '中文',
  de: 'Deutsch',
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-white/10 backdrop-blur-sm border border-neutral-200 dark:border-white/20 text-sm font-medium text-neutral-700 dark:text-white/80 hover:bg-neutral-200 dark:hover:bg-white/15 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span>{languageNames[language]}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 shadow-lg z-50 py-1 overflow-hidden">
            {(Object.keys(languageNames) as Language[]).map((code) => (
              <button
                key={code}
                onClick={() => { setLanguage(code); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  language === code
                    ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-neutral-700 dark:text-white/70 hover:bg-neutral-50 dark:hover:bg-white/5'
                }`}
              >
                {languageNames[code]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
