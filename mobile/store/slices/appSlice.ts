import * as SQLite from 'expo-sqlite';

export type LanguageCode = 'en' | 'ru' | 'uk' | 'he' | 'ar' | 'fa' | 'tr' | 'fr' | 'de' | 'pl' | 'el' | 'zh' | 'ja' | 'ko' | 'vi' | 'hi' | 'es' | 'pt' | 'it' | 'nl' | 'sv';

// Defines the boundary for app state slice
export interface AppState {
  firstLaunch: boolean;
  theme: 'light' | 'dark';
  arEnabled: boolean;
  language: LanguageCode;
  onboardingProgress: number;
  supportsAR: boolean;
  notificationsEnabled: boolean;
  setFirstLaunch: (value: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: LanguageCode) => void;
  setArEnabled: (enabled: boolean) => void;
  setSupportsAR: (supported: boolean) => void;
  setOnboardingProgress: (page: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const createAppSlice = (set: any): AppState => ({
  firstLaunch: true,
  theme: 'light',
  language: 'en',
  arEnabled: false,
  supportsAR: false,
  onboardingProgress: 0,
  notificationsEnabled: true,
  setFirstLaunch: (value) =>
    set((state: any) => ({ ...state, firstLaunch: value })),
  setTheme: (theme) => {
    set((state: any) => ({ ...state, theme }));
    // Persist to SQLite using dbHelper for safety
    import('../../scripts/init-db').then(({ dbHelper }) => {
      dbHelper.updateTheme(theme).catch(e => console.error('Failed to persist theme:', e));
    });
  },
  setLanguage: (lang) => {
    set((state: any) => ({ ...state, language: lang }));
    import('../../scripts/init-db').then(({ dbHelper }) => {
      dbHelper.updateLanguage(lang).catch(e => console.error('Failed to persist language:', e));
    });
  },
  setArEnabled: (enabled) =>
    set((state: any) => ({ ...state, arEnabled: enabled })),
  setSupportsAR: (supported) => {
    set((state: any) => ({ ...state, supportsAR: supported }));
    import('../../scripts/init-db').then(({ dbHelper }) => {
      dbHelper.updateSupportsAR(supported).catch(e => console.error('Failed to persist supportsAR:', e));
    });
  },
  setOnboardingProgress: (page) =>
    set((state: any) => ({ ...state, onboardingProgress: page })),
  setNotificationsEnabled: (enabled) => {
    set((state: any) => ({ ...state, notificationsEnabled: enabled }));
    import('../../scripts/init-db').then(({ dbHelper }) => {
      dbHelper.updateNotificationsEnabled(enabled).catch(e => console.error('Failed to persist notificationsEnabled:', e));
    });
    // Dynamically manage Firebase registration
    import('@react-native-firebase/messaging').then(({ default: messaging }) => {
      if (enabled) {
        messaging().registerDeviceForRemoteMessages().catch(e => console.warn('FCM Reg Failed:', e));
      } else {
        messaging().unregisterDeviceForRemoteMessages().catch(e => console.warn('FCM Unreg Failed:', e));
      }
    });
  },
});
