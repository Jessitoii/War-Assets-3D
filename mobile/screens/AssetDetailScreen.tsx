import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Text, Share, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { theme } from '../styles/theme';
import { useStore } from '../store';
import { AssetHeader } from '../components/asset-detail/AssetHeader';
import { ImageCarousel } from '../components/asset-detail/ImageCarousel';
import { SpecsSummary } from '../components/asset-detail/SpecsSummary';
import { ActionButtons } from '../components/asset-detail/ActionButtons';
import { WikiSection } from '../components/asset-detail/WikiSection';
import { PerformanceRadar } from '../components/asset-detail/PerformanceRadar';
import { useAssetActions } from '../hooks/useAssetActions';
import { CDN_CONFIG } from '../config/cdnConfig';
import { useTranslation } from 'react-i18next';

type Props = StackScreenProps<RootStackParamList, 'AssetDetail'>;

export const AssetDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { assetId } = route.params;
  const { t } = useTranslation();
  const currentTheme = useStore((state) => state.theme);
  const isDark = currentTheme === 'dark';

  const asset = useStore((state) => state.assets.find(a => a.id === assetId));
  const trendingAssets = useStore((state) => state.trendingAssets);
  const trendingAsset = trendingAssets.find(a => a.id === assetId);
  const isTrending = !!trendingAsset;
  const isFavorite = useStore((state) => state.favorites.includes(assetId));

  const { toggleFavorite, handleCompare } = useAssetActions();
  const [loading, setLoading] = useState(!asset);

  useEffect(() => {
    // Simulate loading data if not in store
    if (!asset) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300); // Success criterion: loads within 300ms
      return () => clearTimeout(timer);
    }
  }, [asset]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]}>
        <Text style={{ color: isDark ? '#FFF' : '#000' }}>{t('asset.not_found')}</Text>
      </SafeAreaView>
    );
  }

  // Prepend CDN Base to relative paths
  const displayImages = (asset.images && asset.images.length > 0)
    ? asset.images.map(img => CDN_CONFIG.resolveImage(img)!)
    : (asset.image ? [CDN_CONFIG.resolveImage(asset.image)!] : []);

  // Ensure specs is an object (it might be a double-serialized string from SQLite)
  const getParsedSpecs = (specs: any) => {
    if (!specs) return null;
    if (typeof specs === 'string') {
      try {
        return JSON.parse(specs);
      } catch (e) {
        return null;
      }
    }
    return specs;
  };

  const displaySpecs = getParsedSpecs(asset?.specs) || {
    range: 'N/A',
    speed: 'N/A',
    generation: 'N/A',
    country: 'N/A'
  };

  const rawDanger = asset.dangerLevel || 0;
  const normalizedDanger = rawDanger > 10 ? rawDanger / 10 : rawDanger;
  const isNuclear = normalizedDanger >= 9.0;

  const dangerColor = normalizedDanger > 8 ? '#FF3B30' : normalizedDanger > 5 ? '#FFCC00' : '#4CD964';


  const handleShare = async () => {
    try {
      const mainImage = displayImages[0] || '';
      await Share.share({
        message: `[${t('common.view_asset_intel')}: ${asset.name}]\n\nVisual Recon: ${mainImage}\n\nFull analysis available in War Assets 3D Command Center.`,
        title: asset.name,
      });
    } catch (error: any) {
      console.error('Sharing failed:', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? theme.colors.backgroundDark : theme.colors.backgroundLight }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AssetHeader
        name={asset.name}
        isFavorite={isFavorite}
        isDark={isDark}
        isTrending={isTrending}
        onBack={() => navigation.goBack()}
        onToggleFavorite={() => toggleFavorite(assetId)}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* OSINT TREND ALERT */}
        {isTrending && (
          <View style={styles.trendAlertBox}>
            <View style={styles.trendAlertHeader}>
              <Ionicons name="warning" size={16} color={theme.colors.primary} />
              <Text style={styles.trendAlertTitle}>{t('asset.osint_trend_alert')}</Text>
            </View>
            <Text style={[styles.trendReason, { color: isDark ? '#EEE' : '#333' }]}>
              {trendingAsset.trendingReason}
            </Text>
            {trendingAsset.newsUrl && (
              <TouchableOpacity
                onPress={() => Linking.openURL(trendingAsset.newsUrl!)}
                style={styles.newsLink}
              >
                <Text style={styles.newsLinkText}>{t('asset.view_intel_source')}</Text>
                <Ionicons name="open-outline" size={12} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tactical Badges & Danger Level */}
        <View style={styles.tacticalContainer}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.badgeText, { color: isDark ? '#EEE' : '#333' }]}>{asset.threatType || 'Tactical Asset'}</Text>
            </View>
            {isNuclear && (
              <View style={[styles.badge, { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}>
                <Text style={[styles.badgeText, { color: '#FFF' }]}>☢ {t('asset.nuclear')}</Text>
              </View>
            )}
            <Text style={[styles.dangerValue, { color: dangerColor }]}>{t('asset.danger')}: {normalizedDanger.toFixed(1)}/10</Text>

          </View>

          <View style={styles.progressBackground}>
            <View style={[styles.progressBar, { width: `${normalizedDanger * 10}%`, backgroundColor: dangerColor }]} />
          </View>

        </View>

        <ImageCarousel images={displayImages} />

        <SpecsSummary
          asset={asset}
          isDark={isDark}
          onPress={() => navigation.navigate('TechnicalSpecs', { assetId })}
        />


        <ActionButtons
          hasModel={!!asset.model}
          isDark={isDark}
          onView3D={() => navigation.navigate('ModelViewer', { assetId })}
          onCompare={() => handleCompare(assetId)}
          onShare={handleShare}
        />

        <PerformanceRadar
          metrics={asset.metrics}
          isDark={isDark}
        />

        <WikiSection
          wikiUrl={asset.wikiUrl}
          isDark={isDark}
        />

        <View style={styles.footerPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tacticalContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dangerValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  footerPadding: {
    height: 40,
  },
  trendAlertBox: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderLeftWidth: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  trendAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trendAlertTitle: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  trendReason: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  newsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  newsLinkText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
