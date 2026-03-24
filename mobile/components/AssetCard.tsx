import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Asset } from '../store/slices/assetSlice';
import { theme } from '../styles/theme';
import { useStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { CDN_CONFIG } from '../config/cdnConfig';

interface Props {
  asset: Asset;
  onPress: () => void;
}

export const AssetCard: React.FC<Props> = ({ asset, onPress }) => {
  const currentTheme = useStore((state) => state.theme);
  const isDark = currentTheme === 'dark';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }
      ]}
    >
      <View style={styles.imageContainer}>
        {asset.images && asset.images.length > 0 ? (
          <Image source={{ uri: CDN_CONFIG.resolveImage(asset.images[0]) }} style={styles.image} />
        ) : asset.image ? (
          <Image source={{ uri: CDN_CONFIG.resolveImage(asset.image) }} style={styles.image} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: isDark ? '#333' : '#EEE' }]}>
            <Ionicons name="camera-outline" size={32} color={isDark ? '#444' : '#CCC'} />
            <Text style={[styles.placeholderText, { color: isDark ? '#666' : '#AAA' }]}>NO VISUAL INTEL</Text>
          </View>
        )}
        
        {/* Tactical 3D Availability Badge */}
        {!!asset.model && (
          <View style={styles.modelBadge}>
            <Ionicons name="cube" size={10} color="#000" />
            <Text style={styles.modelBadgeText}>3D</Text>
          </View>
        )}

        {/* Country/Global Badge */}
        <View style={styles.countryBadge}>
          <Text style={styles.countryBadgeText}>
            {asset.countryCode ? asset.countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)) : '🌐'}
          </Text>
        </View>

      </View>
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.name, { color: isDark ? '#FFF' : '#000' }]}>
          {asset.name}
        </Text>
        <Text numberOfLines={1} style={[styles.category, { color: isDark ? '#888' : '#666' }]}>
          {asset.threatType || 'Tactical Asset'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 1,
  },
  modelBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 1,
  },
  modelBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  countryBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countryBadgeText: {
    fontSize: 12,
  }
});
