import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SplashScreen } from '../screens/SplashScreen';
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
import i18n from '../locales';
import * as Localization from 'expo-localization';

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
  const [dbReady, setDbReady] = useState(false);
  const setFirstLaunch = useStore((state) => state.setFirstLaunch);
  const setOnboardingProgress = useStore((state) => state.setOnboardingProgress);
  const setTheme = useStore((state) => state.setTheme);
  const setLanguage = useStore((state) => state.setLanguage);
  const setFavorites = useStore((state) => state.setFavorites);
  const setComparisonQueue = useStore((state) => state.setComparisonQueue);

  useEffect(() => {
    async function setupDb() {
      try {
        const db = await initDB();
        // Since sqlite is init, might sync to store if needed
        const result: any = await db.getFirstAsync('SELECT firstLaunch, onboardingProgress, theme, language, supportsAR FROM app_state WHERE id = 1');
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
          
          setLanguage(lang);
          i18n.changeLanguage(lang);

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

  if (!dbReady) {
    return null; // or a simple loading indicator
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
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
