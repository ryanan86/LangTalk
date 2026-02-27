// Backward compatibility - re-export from new modular location
export type { Language, Translations } from './i18n/types';
export { translations } from './i18n/loader';
export { LanguageProvider, useLanguage, LanguageToggle } from './i18n/context';
