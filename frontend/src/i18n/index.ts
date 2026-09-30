import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import en from './locales/en.json';
import ca from './locales/ca.json';
import el from './locales/el.json';

export const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'ca', label: 'Català' },
  { code: 'el', label: 'Ελληνικά' },
] as const;

export type LangCode = typeof LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      en: { translation: en },
      ca: { translation: ca },
      el: { translation: el },
    },
    // Default language for now: Greek. Only an explicit choice (stored in localStorage) overrides it;
    // the browser language is deliberately ignored so every first visit starts in Greek.
    fallbackLng: 'el',
    defaultNS: 'translation',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'cafgic-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
