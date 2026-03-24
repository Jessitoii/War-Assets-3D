import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { theme } from '../styles/theme';
import { useStore, selectFeaturedAssets, selectCategories, selectTrendingAssets } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { HeaderBar } from '../components/HeaderBar';
import { SearchBar } from '../components/SearchBar';
import { QuickAccessCard } from '../components/QuickAccessCard';
import { CategoryGrid } from '../components/CategoryGrid';
import { initDB } from '../scripts/init-db';
import { Ionicons } from '@expo/vector-icons';
import { CDN_CONFIG } from '../config/cdnConfig';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const currentTheme = useStore((state) => state.theme);
  const isDark = currentTheme === 'dark';
  const { t } = useTranslation();
  
  const featuredAssets = useStore(useShallow(selectFeaturedAssets));
  const trendingAssets = useStore(useShallow(selectTrendingAssets));
  const allAssets = useStore((state) => state.assets);
  const categories = useStore(useShallow(selectCategories));
  const setAssets = useStore((state) => state.setAssets);
  const setCategories = useStore((state) => state.setCategories);
  const syncTrendingAssets = useStore((state) => state.syncTrendingAssets);
  const isTrendingSyncDone = useStore((state) => state.isTrendingSyncDone);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    async function loadData() {
      try {
        const db = await initDB();
        
        // --- TACTICAL SYNC HEALTH CHECK ---
        try {
          const syncResponse = await fetch(`${CDN_CONFIG.BASE_URL}/sync-check`, { signal: AbortSignal.timeout(3000) });
          const remoteMeta = await syncResponse.json();
          const versionResult: any = await db.getFirstAsync('PRAGMA user_version;');
          const localVer = versionResult?.user_version || 0;

          if (remoteMeta.version > localVer) {
            // New intelligence detected (v${remoteMeta.version})
            // In a real scenario, this would trigger an incremental downloader
          }
        } catch (syncErr) {
          // Satellite link weak. Operating with local cached intel.
        }

        
        // Fetch Categories
        const cats: any[] = await db.getAllAsync('SELECT * FROM categories');
        if (cats.length > 0) {
          setCategories(cats);
        }

        // Fetch Assets and map to Frontend Model
        const rawAssets: any[] = await db.getAllAsync('SELECT * FROM assets');
        if (rawAssets.length > 0) {
          const mappedAssets = rawAssets.map(a => ({
            id: a.id,
            name: a.name,
            categoryId: a.catId,
            isFeatured: !!a.featured,
            image: CDN_CONFIG.resolveImage(a.img),
            images: a.images ? CDN_CONFIG.resolveImage(JSON.parse(a.images)) : [],
            model: a.model ? CDN_CONFIG.resolveModel(a.model) : undefined,
            dangerLevel: a.dangerLevel,
            threatType: a.threatType,
            wikiUrl: a.wikiUrl,
            country: a.country,
            countryCode: a.countryCode,
            specs: a.specs ? JSON.parse(a.specs) : undefined,
            translations: a.translations ? JSON.parse(a.translations) : undefined

          }));
          setAssets(mappedAssets);
        }
      } catch (e) {
        console.error('Failed to load home data:', e);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[Home] Retrying data load (${retryCount}/${maxRetries})...`);
          setTimeout(loadData, 1000);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setAssets, setCategories]);

  useEffect(() => {
    if (!loading && allAssets.length > 0 && !isTrendingSyncDone) {
      syncTrendingAssets();
    }
  }, [loading, allAssets.length, isTrendingSyncDone, syncTrendingAssets]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loaderContent}>
          <Ionicons name="locate-outline" size={80} color={theme.colors.primary} style={styles.radarIcon} />
          <Text style={[styles.loadingTextPrimary, { color: isDark ? '#FFF' : '#333' }]}>{t('home.scanning_battlespace')}</Text>
          <Text style={[styles.loadingTextSecondary, { color: isDark ? '#888' : '#666' }]}>{t('home.syncing_assets')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <HeaderBar 
          onSearchPress={() => navigation.navigate('SearchFilter')} 
          onComparePress={() => navigation.navigate('Comparison')}
          onFavoritesPress={() => navigation.navigate('Favorites')}
          onSettingsPress={() => navigation.navigate('Settings')}
          onMapPress={() => navigation.navigate('GlobalMap')}
        />
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <SearchBar onPress={() => navigation.navigate('SearchFilter')} />

          <TouchableOpacity 
            style={styles.hotspotsBanner} 
            onPress={() => navigation.navigate('GlobalMap')}
          >
            <View style={styles.hotspotsContent}>
              <Ionicons name="earth" size={24} color={theme.colors.primary} />
              <View style={styles.hotspotsTextContainer}>
                <Text style={styles.hotspotsTitle}>{t('common.global_hotspots').toUpperCase()}</Text>
                <Text style={styles.hotspotsSubtitle}>{t('home.live_tactical_map')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>{t('common.featured_assets')}</Text>
            {featuredAssets.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
                {featuredAssets.map((asset) => (
                  <QuickAccessCard
                    key={asset.id}
                    asset={asset}
                    onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={24} color={isDark ? '#444' : '#CCC'} />
                <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>{t('common.no_featured')}</Text>
              </View>
            )}
          </View>

          {/* Random Asset of the Day Section */}
          {allAssets.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000', marginBottom: 0 }]}>{t('home.recon_target')}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{t('home.daily_target')}</Text>
                </View>
              </View>
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
                const asset = allAssets[seed % allAssets.length];
                return (
                  <QuickAccessCard
                    asset={asset}
                    onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
                  />
                );
              })()}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000', marginBottom: 0 }]}>{t('home.trending_intel')}</Text>
              <View style={[styles.tag, { backgroundColor: '#FF3B30' }]}>
                <Text style={[styles.tagText, { color: '#FFF' }]}>{t('home.osint_live')}</Text>
              </View>
            </View>
            {trendingAssets.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
                {trendingAssets.map((asset) => (
                  <QuickAccessCard
                    key={`trending-${asset.id}`}
                    asset={asset}
                    onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="stats-chart-outline" size={24} color={isDark ? '#444' : '#CCC'} />
                <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>{t('home.analyzing_metrics')}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>{t('common.categories')}</Text>
            {categories.length > 0 ? (
              <CategoryGrid
                categories={categories}
                onCategoryPress={(categoryId) => navigation.navigate('Category', { categoryId })}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="layers-outline" size={24} color={isDark ? '#444' : '#CCC'} />
                <Text style={[styles.emptyText, { color: isDark ? '#666' : '#AAA' }]}>{t('common.categories_loading')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  featuredScroll: {
    paddingRight: 16,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    alignItems: 'center',
    padding: 20,
  },
  radarIcon: {
    marginBottom: 24,
    opacity: 0.8,
  },
  loadingTextPrimary: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
  },
  loadingTextSecondary: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 250,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  tag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  hotspotsBanner: {
    marginTop: 16,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hotspotsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hotspotsTextContainer: {
    flexDirection: 'column',
  },
  hotspotsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hotspotsSubtitle: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 0.5,
  }
});
