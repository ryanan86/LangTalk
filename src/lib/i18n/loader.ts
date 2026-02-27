import type { Language, Translations } from './types';

import ko from './translations/ko.json';
import en from './translations/en.json';
import nl from './translations/nl.json';
import ru from './translations/ru.json';
import fr from './translations/fr.json';
import es from './translations/es.json';
import zh from './translations/zh.json';
import de from './translations/de.json';

export const translations: Record<Language, Translations> = {
  ko: ko as Translations,
  en: en as Translations,
  nl: nl as Translations,
  ru: ru as Translations,
  fr: fr as Translations,
  es: es as Translations,
  zh: zh as Translations,
  de: de as Translations,
};
