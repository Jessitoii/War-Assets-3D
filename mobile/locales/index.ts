import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en.json';
import tr from './tr.json';
import ru from './ru.json';
import ar from './ar.json';
import zh from './zh.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  ru: { translation: ru },
  ar: { translation: ar },
  zh: { translation: zh },
};

// Detect system language
const getSystemLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const code = locales[0].languageCode;
    const supported = ['en', 'tr', 'ru', 'ar', 'zh'];
    if (code && supported.includes(code)) return code;
  }
  return 'en';
};

const defaultLang = getSystemLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
