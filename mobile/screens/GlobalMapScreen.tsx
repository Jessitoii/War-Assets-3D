import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/NavigationRoot';
import { theme } from '../styles/theme';
import { useStore } from '../store';
import { MapIntelService, TacticalPoint } from '../services/MapIntelService';
import hotspotsData from '../assets/data/hotspots.json';
import { XMLParser } from 'fast-xml-parser';

type Props = StackScreenProps<RootStackParamList, 'GlobalMap'>;

// OpenStreetMap Tile Provider (CartoDB Dark Matter)
const OSM_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const GlobalMapScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const assets = useStore((state) => state.assets);
  const [rssItems, setRssItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<TacticalPoint | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Delay rendering of map for native module to mount fully
    const timer = setTimeout(() => setShowMap(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchAndProcessIntel = async () => {
      try {
        const RSS_URL = 'https://news.google.com/rss/search?q=military+defense+tanks+war+jets+missiles&hl=en-US&gl=US&ceid=US:en';
        const response = await fetch(RSS_URL);
        const xmlData = await response.text();

        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlData);
        const items = jsonObj.rss?.channel?.item || [];
        setRssItems(items);
      } catch (error) {
        console.error('Map Intel Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessIntel();
  }, [assets]);

  const tacticalPoints = useMemo(() => {
    return MapIntelService.getTacticalPoints(rssItems, hotspotsData as any, assets);
  }, [rssItems, assets]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('common.global_hotspots').toUpperCase()}</Text>
        <View style={styles.headerRight}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>LIVE FEED</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.tactical_map_loading')}</Text>
        </View>
      ) : showMap ? (
        <View style={{ flex: 1 }}>
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={{ flex: 1 }}
            onPress={() => setSelectedPoint(null)}
            onMapReady={() => console.log('MAP_READY')}
            onMapLoaded={() => console.log('MAP_LOADED')}
            initialRegion={{
              latitude: 20,
              longitude: 0,
              latitudeDelta: 100,
              longitudeDelta: 100,
            }}
          >
            <UrlTile 
              urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              zIndex={1}
              shouldReplaceMapContent={false}
            />

            {tacticalPoints.map((point) => (
              <Marker
                key={point.id}
                coordinate={{ latitude: point.lat, longitude: point.lng }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedPoint(point);
                }}
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="scan-outline" size={28} color={theme.colors.primary} />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Custom Callout Overlay */}
          {selectedPoint && (
            <View style={styles.calloutOverlay}>
              <View style={styles.calloutContainer}>
                <TouchableOpacity
                  style={styles.closeCallout}
                  onPress={() => setSelectedPoint(null)}
                >
                  <Ionicons name="close" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.calloutLocation}>{selectedPoint.locationName.toUpperCase()}</Text>
                <Text style={styles.calloutTitle}>{selectedPoint.newsTitle}</Text>
                {selectedPoint.relatedAssetId && (
                  <TouchableOpacity
                    style={styles.intelButton}
                    onPress={() => {
                      navigation.navigate('AssetDetail', { assetId: selectedPoint.relatedAssetId! });
                      setSelectedPoint(null);
                    }}
                  >
                    <Text style={styles.intelButtonText}>{t('common.view_asset_intel')}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#000" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.mapPlaceholder} />
      )}

      {/* Put overlay inside a pointerEvents='none' map wrapper or position it absolute */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.intelCount}>
          <Text style={styles.intelCountText}>{tacticalPoints.length} ACTIVE HOTSPOTS</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  statusText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 12,
    letterSpacing: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  calloutContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowRadius: 10,
    shadowOpacity: 0.3,
  },
  closeCallout: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  calloutLocation: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1,
  },
  calloutTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  intelButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  intelButtonText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  overlay: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  intelCount: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  intelCountText: {
    color: '#AAA',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
