import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: (() => {
      const canUseLocalStorage = () => {
        if (typeof window === 'undefined') return false;
        try {
          const testKey = '__i18n_storage_test__';
          window.localStorage.setItem(testKey, '1');
          window.localStorage.removeItem(testKey);
          return true;
        } catch (error) {
          return false;
        }
      };

      const useLocalStorage = canUseLocalStorage();

      return {
        order: useLocalStorage ? ['localStorage', 'navigator', 'htmlTag'] : ['navigator', 'htmlTag'],
        caches: useLocalStorage ? ['localStorage'] : [],
      };
    })(),
  });

// Keep <html lang> in sync with the active i18n language so screen readers
// announce content with the right pronunciation rules (WCAG 3.1.1/3.1.2).
if (typeof document !== 'undefined') {
  const syncLang = (lng: string) => {
    document.documentElement.lang = (lng || 'en').split('-')[0];
  };
  syncLang(i18n.language);
  i18n.on('languageChanged', syncLang);
}

export default i18n;