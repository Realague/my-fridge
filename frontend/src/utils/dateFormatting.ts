import { format } from 'date-fns';
import { enUS, es, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

// Map i18n language codes to date-fns locales
const localeMap = {
  en: enUS,
  es: es,
  fr: fr,
} as const;

type SupportedLocale = keyof typeof localeMap;

/**
 * Get the appropriate date-fns locale based on the current i18n language
 */
export const getDateLocale = (language: string) => {
  return localeMap[language as SupportedLocale] || enUS;
};

/**
 * Format a date with internationalization support
 * @param date - The date to format
 * @param formatString - The format string (e.g., 'EEEE, MMMM d')
 * @param language - Optional language override
 * @returns Formatted date string
 */
export const formatDate = (date: Date, formatString: string, language?: string) => {
  const currentLanguage = language || document.documentElement.lang || 'en';
  const locale = getDateLocale(currentLanguage);
  return format(date, formatString, { locale });
};

/**
 * Get locale-specific format patterns
 */
const getLocaleSpecificFormat = (formatString: string, language: string): string => {
  // For French locale, adjust common format patterns to match French conventions
  if (language === 'fr') {
    // Change 'MMM d' to 'd MMM' for French (29 sept instead of sept. 29)
    if (formatString === 'MMM d') {
      return 'd MMM';
    }
    // Change 'MMMM d' to 'd MMMM' for French
    if (formatString === 'MMMM d') {
      return 'd MMMM';
    }
    // Change 'MMM dd' to 'dd MMM' for French
    if (formatString === 'MMM dd') {
      return 'dd MMM';
    }
    // Change 'EEEE, MMMM d' to 'EEEE d, MMMM' for French
    if (formatString === 'EEEE, MMMM d') {
      return 'EEEE d, MMMM';
    }
  }
  
  return formatString;
};

/**
 * Hook for internationalized date formatting
 * Uses the current i18n language
 */
export const useDateFormat = () => {
  const { i18n } = useTranslation();
  
  return {
    formatDate: (date: Date, formatString: string) => {
      const localeSpecificFormat = getLocaleSpecificFormat(formatString, i18n.language);
      return formatDate(date, localeSpecificFormat, i18n.language);
    },
    getLocale: () => getDateLocale(i18n.language),
  };
};
