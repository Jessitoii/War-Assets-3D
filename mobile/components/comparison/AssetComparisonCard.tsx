import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../../store/slices/assetSlice';
import { theme } from '../../styles/theme';
import { ThreeDModelViewer } from '../model-viewer/ThreeDModelViewer';
import { CDN_CONFIG } from '../../config/cdnConfig';

interface Props {
  asset: Asset;
  onRemove: () => void;
  onPressMiniPreview: () => void;
  isDark: boolean;
}

export const AssetComparisonCard: React.FC<Props> = ({ asset, onRemove, onPressMiniPreview, isDark }) => {
  return (
    <View style={[styles.card, {
      backgroundColor: isDark ? '#1C1C1E' : '#FFF',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    }]}>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
      </TouchableOpacity>

      {asset.images && asset.images.length > 0 ? (
        <Image source={{ uri: asset.images[0] }} style={styles.thumbnail} resizeMode="cover" />
      ) : asset.image ? (
        <Image source={{ uri: asset.image }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder, { backgroundColor: isDark ? '#333' : '#EEE' }]}>
          <Ionicons name="camera-outline" size={32} color={isDark ? '#444' : '#CCC'} />
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: isDark ? '#FFF' : '#000' }]} numberOfLines={1}>{asset.name}</Text>

        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

        {asset.specs && (
          <View style={styles.specsContainer}>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>Range:</Text>
              <Text style={[styles.specValue, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>{asset.specs.range}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>Speed:</Text>
              <Text style={[styles.specValue, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>{asset.specs.speed}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>Gen:</Text>
              <Text style={[styles.specValue, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>{asset.specs.generation}</Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.miniPreviewContainer} onPress={onPressMiniPreview}>
        <ThreeDModelViewer assetId={asset.id} modelUrl={asset.model || ''} isMini={true} />
        <View style={styles.miniPreviewOverlay}>
          <Ionicons name="expand-outline" size={16} color="#FFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 260,
    marginHorizontal: 8,
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 10,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  thumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 16,
  },
  infoContainer: {
    paddingVertical: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  specsContainer: {
    gap: 6,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  specValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  miniPreviewContainer: {
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  miniPreviewOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 8,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
