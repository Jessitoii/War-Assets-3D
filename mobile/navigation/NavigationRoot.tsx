import React, { useEffect, useState, useRef } from 'react';
import analytics from '@react-native-firebase/analytics';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import Constants from 'expo-constants';

// Helper to check for native firebase availability
const isFirebaseAvailable = () => {
  try {
    return !!(analytics && analytics());
  } catch (e) {
    return false;
  }
};
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoadingScreen } from '../screens/LoadingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SearchFilterScreen } from '../screens/SearchFilterScreen';
import { AssetDetailScreen } from '../screens/AssetDetailScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { initDB } from '../scripts/init-db';
import { useStore } from '../store';
import { TechnicalSpecsScreen } from '../screens/TechnicalSpecsScreen';
import { ModelViewerScreen } from '../screens/ModelViewerScreen';
import { ComparisonScreen } from '../screens/ComparisonScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { GlobalMapScreen } from '../screens/GlobalMapScreen';
import i18n, { ensureLanguageLoaded } from '../locales';
import * as Localization from 'expo-localization';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Onboarding: undefined;
  SearchFilter: undefined;
  AssetDetail: { assetId: string };
  Category: { categoryId: string };
  TechnicalSpecs: { assetId: string };
  ModelViewer: { assetId: string };
  Comparison: undefined;
  Settings: undefined;
  Favorites: undefined;
  GlobalMap: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const NavigationRoot = () => {
  const navigationRef = useRef<any>(null);
  const routeNameRef = useRef<string | undefined>(undefined);
  const [dbReady, setDbReady] = useState(false);
  const setFirstLaunch = useStore((state) => state.setFirstLaunch);
  const setOnboardingProgress = useStore((state) => state.setOnboardingProgress);
  const setTheme = useStore((state) => state.setTheme);
  const setLanguage = useStore((state) => state.setLanguage);
  const setFavorites = useStore((state) => state.setFavorites);
  const setComparisonQueue = useStore((state) => state.setComparisonQueue);
  const setNotificationsEnabled = useStore((state) => state.setNotificationsEnabled);
  const notificationsEnabled = useStore((state) => state.notificationsEnabled);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      try {
        // Load custom fonts (if any) or just wait for font subsystem initialization
        await Font.loadAsync({
          // Mock some custom fonts or just initialize existing system ones if needed
          // 'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'), 
        });
      } catch (e) {
        console.warn('Font loading error:', e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadAssets();
  }, []);

  useEffect(() => {
    if (dbReady && fontsLoaded) {
      // Everything is ready (Fonts + DB hydration + I18n detection)
      // Hide the native splash screen to start the transition to the custom animation
      SplashScreen.hideAsync();
    }
  }, [dbReady, fontsLoaded]);

  useEffect(() => {
    async function setupDb() {
      try {
        const db = await initDB();
        // Since sqlite is init, might sync to store if needed
        const result: any = await db.getFirstAsync('SELECT firstLaunch, onboardingProgress, theme, language, supportsAR, notificationsEnabled FROM app_state WHERE id = 1');
        if (result) {
          const isFirstLaunch = Boolean(result.firstLaunch);
          setFirstLaunch(isFirstLaunch);
          setOnboardingProgress(result.onboardingProgress || 0);
          setTheme(result.theme || 'light');

          let lang = result.language;
          if (isFirstLaunch && !lang) {
            const systemLocales = Localization.getLocales();
            const systemLanguage = systemLocales.length > 0 ? systemLocales[0].languageCode : 'en';
            const supported = ['en', 'tr', 'ru', 'ar', 'zh'];
            lang = (systemLanguage && supported.includes(systemLanguage)) ? systemLanguage : 'en';
          } else if (!lang) {
            lang = 'en';
          }

          await ensureLanguageLoaded(lang);
          setLanguage(lang);
          await i18n.changeLanguage(lang);

          setNotificationsEnabled(result.notificationsEnabled !== undefined ? Boolean(result.notificationsEnabled) : true);

          // Update supportsAR in store
          useStore.getState().setSupportsAR(Boolean(result.supportsAR));
        }

        const favs: any[] = await db.getAllAsync('SELECT assetId FROM favorites');
        setFavorites(favs.map(f => f.assetId));

        const queue: any[] = await db.getAllAsync('SELECT assetId FROM comparison_queue');
        setComparisonQueue(queue.map(q => q.assetId));
      } catch (e) {
        console.error('DB Error: ', e);
      } finally {
        setDbReady(true);
      }
    }
    setupDb();
  }, [setFirstLaunch, setOnboardingProgress, setFavorites, setComparisonQueue, setTheme]);

  useEffect(() => {
    // Log app boot/open for 'Active Users' verification
    if (isFirebaseAvailable()) {
      analytics().logAppOpen().catch(e => console.warn('App open log failed:', e));
    } else {
      console.warn('[Firebase] Analytics not available (probably Expo Go)');
    }
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;

    const setupMessaging = async () => {
      if (!isFirebaseAvailable()) {
        console.warn('[Firebase] Messaging not available');
        return;
      }
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const token = await messaging().getToken();
          console.log('[FCM] Token:', token);
        }
      } catch (e) {
        console.warn('[FCM] Setup error:', e);
      }
    };

    if (!isFirebaseAvailable()) return;

    setupMessaging();

    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title || 'Tactical Update',
        remoteMessage.notification?.body || 'New intelligence available.',
        [{ text: 'Dismiss', style: 'cancel' }]
      );
    });

    // Handle notification click when app is in background but still in memory
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FCM] Notification caused app to open from background state:', remoteMessage.notification);
    });

    // Check if app was opened by a notification when it was completely closed
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('[FCM] Notification caused app to open from quit state:', remoteMessage.notification);
      }
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
    };
  }, [notificationsEnabled]);

  if (!dbReady) {
    return null; // or a simple loading indicator
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

        if (previousRouteName !== currentRouteName && currentRouteName) {
          // Log screen_view using the specific method requested/legacy if available, 
          // or logScreenView for modern SDKs
          if (isFirebaseAvailable()) {
            try {
              await analytics().logScreenView({
                screen_name: currentRouteName,
                screen_class: currentRouteName,
              });
            } catch (e) {
              console.warn('Analytics error:', e);
            }
          }
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={LoadingScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="SearchFilter" component={SearchFilterScreen} />
        </Stack.Group>
        <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="TechnicalSpecs" component={TechnicalSpecsScreen} />
        <Stack.Screen name="ModelViewer" component={ModelViewerScreen} />
        <Stack.Screen name="Comparison" component={ComparisonScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="GlobalMap" component={GlobalMapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
